## about

Get the contents of the audio stream output from Amazon Connect to KinesisVideoStreams in a general audio format.


## usage sample

```sample.js
import { getRawSamples, getWaveData } from "./lib/streams.js";
import fs from "fs";

const rawSamples = await getRawSamples(
    "arn:aws:kinesisvideo:ap-northeast-1:123456789012:stream/my-strea-name/0000000000000",
    "00000000000000000000000000000000000000000000000"
)
const wavData = getWaveData(rawSamples);
fs.writeFileSync('sample.wav', wavData);
```
