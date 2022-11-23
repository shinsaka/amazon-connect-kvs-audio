## about

Get the contents of the audio stream output from Amazon Connect to KinesisVideoStreams in a general audio format.


## for ES Mosules

Works with ES Modules.


## usage sample

```sample.js
import { getRawSamples, getWaveData } from "amazon-connect-kvs-audio";
import fs from "fs";

/*
 arguments:
   1. an Arn of the KinesisVideoStream
   2. a fragment number
*/
const rawSamples = await getRawSamples(
    "arn:aws:kinesisvideo:ap-northeast-1:123456789012:stream/my-stream-name/0000000000000",
    "00000000000000000000000000000000000000000000000"
)

// pass data got above to getWaveData(), and write the result to a file.
const wavData = getWaveData(rawSamples);
fs.writeFileSync('sample.wav', wavData);
```


## Set up Amazon Connect

1. Put a block "Start media streaming" in the flow of the contact flow.
  - https://docs.aws.amazon.com/connect/latest/adminguide/start-media-streaming.html
2. Save the attributes Media streams, "Customer audio stream ARN" and "fragment number".
3. Use two attributes in the above step in the code.
