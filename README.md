## about

Get the contents of the audio stream output from Amazon Connect to KinesisVideoStreams in a general audio format.


## for ES Mosules

Works with ES Modules.


## usage sample

### ver 0.1.0 Compatible

- NOT recommended
- With Start Fragment Number

```js:sample-010.js
import { getRawSamples, getWaveData } from "amazon-connect-kvs-audio";
import fs from "fs";

/*
 arguments:
   1. an Arn of the KinesisVideoStream
   2. a Start fragment number
*/
const rawSamples = await getRawSamples(
    "arn:aws:kinesisvideo:ap-northeast-1:123456789012:stream/my-stream-name/0000000000000",
    "00000000000000000000000000000000000000000000000"
)


// pass data got above to getWaveData(), and write the result to a file.
const wavData = getWaveData(rawSamples);
fs.writeFileSync('sample.wav', wavData);
```


### ver 0.2.0

#### With FragmentList

- Use parameters streamArn, startTimestamp and endTimestamp

```js:with_fragmentlist.js
import { getFragments, getMediaPayloadWithFragmentList, getSamples, getWaveData } from "amazon-connect-kvs-audio";
import fs from "fs";

const streamArn = 'arn:aws:kinesisvideo:ap-northeast-1:123456789012:stream/stream-name-00000000/000000000';
const startTimestamp = new Date('2023-08-17T00:30:00Z');
const endTimestamp = new Date('2023-08-17T00:35:15Z');

const fragments = await getFragments(streamArn, startTimestamp, endTimestamp);
console.log(`${fragments.length} fragments found.`);

const fragmentNumbers = fragments.map(fragment => fragment.FragmentNumber);  // ['<flagmentNumber>', ...]
const payload = await getMediaPayloadWithFragmentList(streamArn, fragmentNumbers);

const rawSamples = await getSamples(payload);
console.log(`audio to customer data length = ${rawSamples.AUDIO_TO_CUSTOMER.length}`);
console.log(`audio from customer data length = ${rawSamples.AUDIO_FROM_CUSTOMER.length}`);

const wavData = getWaveData(rawSamples);
fs.writeFileSync('sample.wav', wavData);
console.log(`sample.wav ${wavData.length} bytes written.`);
```

#### With StartFragmentNumber

- Use parameters streamArn, startFragmentNumber

```js:with_startfragmentnumber.js
import { getMediaPayload, getSamples, getWaveData } from "amazon-connect-kvs-audio";
import fs from "fs";

const streamArn = 'arn:aws:kinesisvideo:ap-northeast-1:123456789012:stream/stream-name-00000000/000000000';
const startFragment = '00000000000000000000000000000000000000000000000';

const payload = await getMediaPayload(streamArn, startFragment);
const rawSamples = await getSamples(payload);
console.log(`audio to customer data length = ${rawSamples.AUDIO_TO_CUSTOMER.length}`);
console.log(`audio from customer data length = ${rawSamples.AUDIO_FROM_CUSTOMER.length}`);

const wavData = getWaveData(rawSamples);
fs.writeFileSync('sample_fragmentnumber.wav', wavData);
console.log(`sample.wav ${wavData.length} bytes written.`);
```

## Set up Amazon Connect

1. Put a block "Start media streaming" in the flow of the contact flow.
  - https://docs.aws.amazon.com/connect/latest/adminguide/start-media-streaming.html
2. Save the attributes Media streams, "Customer audio stream ARN" and "fragment number".
3. Use two attributes in the above step in the code.
