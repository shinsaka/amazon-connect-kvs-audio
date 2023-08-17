## about

Get the contents of the audio stream output from Amazon Connect to KinesisVideoStreams in a general audio format.


## for ES Mosules

Works with ES Modules.


## usage sample

```js
import { getRawSamples, getWaveData} from "./lib/kvs-audio-lib.js";
import { getMediaPayload } from "./lib/kvs-audio-lib.js";
import { getFragments, getMediaPayloadWithFragmentList } from "./lib/kvs-audio-lib.js";
import fs from "fs";

const streamArn = 'arn:aws:kinesisvideo:ap-northeast-1:123456789012:stream/stream-name-00000000/000000000';
const startTimestamp = new Date('2023-08-17T00:30:00Z');
const endTimestamp = new Date('2023-08-17T00:35:15Z');
const startFragment = '00000000000000000000000000000000000000000000000';

// with FragmentList
// use parameters streamArn, startTimestamp and endTimestamp
{
    console.log('** start with FragmentList');
    const fragments = await getFragments(streamArn, startTimestamp, endTimestamp);
    console.log(`${fragments.length} fragments found.`);
    const payload = await getMediaPayloadWithFragmentList(streamArn, fragments.map(fragment => fragment.FragmentNumber));
    const rawSamples = await getRawSamples(payload);
    console.log(`audio to customer data length = ${rawSamples.AUDIO_TO_CUSTOMER.length}`);
    console.log(`audio from customer data length = ${rawSamples.AUDIO_FROM_CUSTOMER.length}`);
    const wavData = getWaveData(rawSamples);
    fs.writeFileSync('sample.wav', wavData);
    console.log(`sample.wav ${wavData.length} bytes written.`);
}

// with FragmentNumber
// use parameters streamArn and startFragment
{
    console.log('** start with FragmentNumber');
    const payload = await getMediaPayload(streamArn, startFragment);
    const rawSamples = await getRawSamples(payload);
    console.log(`audio to customer data length = ${rawSamples.AUDIO_TO_CUSTOMER.length}`);
    console.log(`audio from customer data length = ${rawSamples.AUDIO_FROM_CUSTOMER.length}`);
    const wavData = getWaveData(rawSamples);
    fs.writeFileSync('sample_fragmentnumber.wav', wavData);
    console.log(`sample.wav ${wavData.length} bytes written.`);
}
```

## Set up Amazon Connect

1. Put a block "Start media streaming" in the flow of the contact flow.
  - https://docs.aws.amazon.com/connect/latest/adminguide/start-media-streaming.html
2. Save the attributes Media streams, "Customer audio stream ARN" and "fragment number".
3. Use two attributes in the above step in the code.
