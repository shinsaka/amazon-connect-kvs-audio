import { KinesisVideoClient, GetDataEndpointCommand} from "@aws-sdk/client-kinesis-video";
import { KinesisVideoMedia, GetMediaCommand } from "@aws-sdk/client-kinesis-video-media";
import { KinesisVideoArchivedMediaClient, ListFragmentsCommand, GetMediaForFragmentListCommand } from "@aws-sdk/client-kinesis-video-archived-media";
import { EbmlStreamDecoder, EbmlTagId } from "ebml-stream";
import waveFile from "wavefile";
import stream from "stream";

/**
 * Get a KVS-Endpoint for a given stream
 * @param {string} streamArn
 */
const getMediaEndPoint = async (streamArn, apiName) => {
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/kinesis-video/command/GetDataEndpointCommand/
    const client = new KinesisVideoClient();
    const command = new GetDataEndpointCommand({ APIName: apiName, StreamARN: streamArn });
    const response = await client.send(command);
    return response.DataEndpoint;
};

/**
 * Get a KVS-Stream with a given streamArn and fragmentNumber
 * @param {*} streamArn
 * @param {*} fragmentNumber
 * @returns
 */
export const getMediaPayload = async (streamArn, fragmentNumber) => {
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/kinesis-video-media/command/GetMediaCommand/
    const kinesisVideoMedia = new KinesisVideoMedia({
        endpoint: getMediaEndPoint(streamArn, 'GET_MEDIA')
    });
    const command = new GetMediaCommand({
        StreamARN: streamArn,
        StartSelector: {
            StartSelectorType: 'FRAGMENT_NUMBER',
            AfterFragmentNumber: fragmentNumber
        }
    });
    const response = await kinesisVideoMedia.send(command);
    return response.Payload;
};

/**
 *
 * @param {string} streamArn
 * @param {Date} startTimestamp
 * @param {Date} endTimestamp
 * @param {string} fragmentSelectorType  // 'PRODUCER_TIMESTAMP' | 'SERVER_TIMESTAMP'
 * @returns
 */
export const getFragments = async (streamArn, startTimestamp, endTimestamp, fragmentSelectorType = 'PRODUCER_TIMESTAMP') => {
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/kinesis-video-archived-media/command/ListFragmentsCommand/
    const config = {
        endpoint: getMediaEndPoint(streamArn, 'LIST_FRAGMENTS')
    };
    const client = new KinesisVideoArchivedMediaClient(config);
    const input = {
        StreamARN: streamArn,
        MaxResults: 1000,
        FragmentSelector: {
            FragmentSelectorType: fragmentSelectorType,
            TimestampRange: {
                StartTimestamp: startTimestamp,
                EndTimestamp: endTimestamp
            }
        }
    };
    const fragments = await recursiveGetFragments(client, input, null);
    return fragments.sort((a, b) => { return a.ServerTimestamp - b.ServerTimestamp; });
};

/**
 * @param {KinesisVideoArchivedMediaClient} client
 * @param {object} input
 * @param {string} nextToken
 * @returns
 */
const recursiveGetFragments = async (client, input, nextToken) => {
    // 複数のfragmentリストを再帰的に取得、結合する
    if (nextToken) {
        input.NextToken = nextToken;
    }
    const command = new ListFragmentsCommand(input);
    const response = await client.send(command);
    const fragments = response.Fragments;
    if (response.NextToken) {
        return fragments.concat(await recursiveGetFragments(client, input, response.NextToken));
    }
    return fragments;
}

/**
 * @param {string} streamArn
 * @param {Array} fragments ['<flagmentNumber>', ...]
 * @returns
 */
export const getMediaPayloadWithFragmentList = async (streamArn, fragments) => {
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/kinesis-video-archived-media/command/GetMediaForFragmentListCommand/
    const config = {
        endpoint: getMediaEndPoint(streamArn, 'GET_MEDIA_FOR_FRAGMENT_LIST')
    };
    const client = new KinesisVideoArchivedMediaClient(config);
    const input = {
        StreamARN: streamArn,
        Fragments: fragments
    };
    const command = new GetMediaForFragmentListCommand(input);
    const response = await client.send(command);
    return response.Payload;
};

/**
 * Get samples by tracks from a KVS-Stream as a binary signed integers
 * @param {*} streamArn
 * @param {*} fragmentNumber
 * @returns object: {trackName: Array|TypedArray}
 * @deprecated use getSamples() instead.(for v0.1.0 compatibility)
 */
export const getRawSamples = async (streamArn, fragmentNumber) => {
    return getSamples(await getMediaPayload(streamArn, fragmentNumber));
};

/**
 * Get samples by tracks from a KVS-Stream as a binary signed integers
 * @param {*} mediaStream
 * @returns object: {trackName: Array|TypedArray}
 */
export const getSamples = async (mediaStream) => {
    const rawChunks = {};  // { trackName: [sample1, sample2, ...] }
    await mediaStream.pipe(new EbmlStreamDecoder({bufferTagIds: [EbmlTagId.TrackEntry]}))
        .pipe(new ExtractAudio())
        .forEach((chunk) => {
            if (!rawChunks[chunk.trackName]) {
                rawChunks[chunk.trackName] = [];
            }
            rawChunks[chunk.trackName].push(chunk.payload);
        });

    // combine all samples by track, and convert as Signed-Int16
    const rawSamples = {};  // { trackName: [sample1, sample2, ...] }
    for (let trackName in rawChunks) {
        const sample = Buffer.concat(rawChunks[trackName]);

        const arrayBuffer = new ArrayBuffer(sample.length);
        const viewUint8 = new Uint8Array(arrayBuffer);
        const viweInt16 = new Int16Array(arrayBuffer);
        viewUint8.set(sample);

        rawSamples[trackName] = viweInt16;
    };
    return rawSamples;
};

/**
 * Get a wav file data with converted samples
 * @param {object:{trackName: Array|TypedArray}} rawSamples
 * @returns
 */
export const getWaveData = (rawSamples) => {
    // { trackName: [sample1, sample2, ...] }
    // trackName is "AUDIO_FROM_CUSTOMER" | "AUDIO_TO_CUSTOMER"
    let sampleData, numOfChannels;
    if (rawSamples["AUDIO_FROM_CUSTOMER"] && rawSamples["AUDIO_TO_CUSTOMER"]) {
        // output is two channels
        sampleData = [rawSamples["AUDIO_FROM_CUSTOMER"], rawSamples["AUDIO_TO_CUSTOMER"]];
        numOfChannels = 2;
    } else if (rawSamples["AUDIO_FROM_CUSTOMER"]) {
        // output is one channel, from customer
        sampleData = rawSamples["AUDIO_FROM_CUSTOMER"];
        numOfChannels = 1;
    } else if (rawSamples["AUDIO_TO_CUSTOMER"]) {
        // output is one channel, to customer(audio from agent)
        sampleData = rawSamples["AUDIO_TO_CUSTOMER"];
        numOfChannels = 1;
    }

    const wav = new waveFile.WaveFile();
    wav.fromScratch(numOfChannels, 8000, '16', sampleData);
    return wav.toBuffer();
}

/**
 * input stream is EbmlStreamDecoder
 */
export class ExtractAudio extends stream.Transform {
    constructor(options = {}) {
        super(Object.assign({}, options, {
            readableObjectMode: true,
            writableObjectMode: true,
        }));
        this._targetTrackNames = options.targetTrackNames || [];
        this._targetTracks = {};  // trackNumber -> trackName
    }

    _transform(chunk, encoding, callback) {
        if (chunk.id === EbmlTagId.TrackEntry) {
            // tracktype=2 is audio
            const trackType= chunk.Children.find(c => c.id === EbmlTagId.TrackType)?.data;
            const trackName = chunk.Children.find(c => c.id === EbmlTagId.Name)?.data;
            const trackNumber = chunk.Children.find(c => c.id === EbmlTagId.TrackNumber)?.data;
            if (trackType == 2) {
                // target tracknames is empty or match
                if (this._targetTrackNames.length == 0 || this._targetTrackNames.includes(trackName)) {
                    this._targetTracks[trackNumber] = trackName;
                }
            }
            chunk = null;
        } else if (chunk.id === EbmlTagId.SimpleBlock && this._targetTracks[chunk.track]) {
            // target block...append track name if available
            if (chunk.track) {
                chunk.trackName = this._targetTracks[chunk.track] || 'unknown';
            }
        } else {
            chunk = null;
        }
        callback(null, chunk);
    }
}
