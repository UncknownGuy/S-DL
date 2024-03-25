const { spawn } = require('child_process');
const { existsSync, mkdirSync } = require('fs');
const { SingleBar } = require('cli-progress');
const nodemon = require('nodemon');

function recordAndPreviewStream(link, outputPath, duration) {
    try {
        const totalSeconds = convertDurationToSeconds(duration);
        const progressBar = new SingleBar({
            format: ' Recording Progress [{bar}] {percentage}% | ETA: {eta_formatted} | {value}/{total}s',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        progressBar.start(totalSeconds, 0);

        const recordCommand = `ffmpeg -i "${link}" -t ${duration} -c copy "${outputPath}"`;
        const recordProcess = spawn(recordCommand, {
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        recordProcess.on('error', (error) => {
            console.error(`Error executing FFmpeg command: ${error.message}`);
        });

        let startTime = Date.now(); // Record start time for ETA calculation

        recordProcess.stderr.on('data', (data) => {
            const str = data.toString();
            const matches = str.match(/time=(\d+:\d+:\d+)/);
            if (matches) {
                const currentTime = matches[1];
                const [hours, minutes, seconds] = currentTime.split(':').map(Number);
                const elapsedTimeInSeconds = hours * 3600 + minutes * 60 + seconds;

                // Update the progress bar
                progressBar.update(elapsedTimeInSeconds);

                // Calculate and display ETA
                const elapsedTime = Date.now() - startTime;
                const estimatedTotalTime = (elapsedTime / elapsedTimeInSeconds) * totalSeconds;
                const eta = new Date(Date.now() + estimatedTotalTime);
                progressBar.update(elapsedTimeInSeconds, {
                    eta_formatted: formatETA(eta)
                });
            }
        });

        recordProcess.on('exit', (code) => {
            progressBar.stop();
            if (code !== 0) {
                // console.log if ffmpeg faild when start recording
                console.error(`Error FFmpeg process exited with code ${code}`);
            } else {
                console.log(`Recording of the stream completed successfully`);
                console.log(`Saving Video file to ${outputPath}...`);
                // Clear console.log messages after 5 seconds
                setTimeout(() => {
                    console.clear();
                }, 5000);
            }
        });
    } catch (error) {
        // Cath recordProcess Error //
        console.error("An error occurred: ", error);
    }
}

//  Eta Convert to hh:mm:ss format //
function formatETA(eta) {
    const hours = String(eta.getHours()).padStart(2, '0');
    const minutes = String(eta.getMinutes()).padStart(2, '0');
    const seconds = String(eta.getSeconds()).padStart(2, '0');
    return `${hours} : ${minutes} : ${seconds}`;
}
//  Record Duration Convert to hh:mm:ss format //
function convertDurationToSeconds(duration) {
    const [hours, minutes, seconds] = duration.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}

//--if you record multiple stream you need smooth stable connection--//
const streamLinks = [
    // if you don't know how to get the link watch tutorial //
    // suggest: use chaturbate website for stream link
    // example usage // "https://edge{random}-nrt.live.mmcdn.com/live-edge/amlst:{streamer}-sd-e175031d93a459290cf82bcc0fc3f6c500abd1718fb0286732f21904f73a21c9_trns_h264/chunklist_w451849794_b1148000_t64RlBTOjI5Ljk3.m3u8",

];

const streamers = [
    // use for creation folders and when store the streams
    "streamer-name",
];

// Format For Recording Use .mp4 OR use Something Else
const Format = '.mp4';

//--If Your Using Following Path You Must Need To Create [ Stream-DL ] Folder in [ C:\Users\{usename}\Videos\ ]
const RecFolder = `C:\\Users\\{username}\\Videos\\Stream-DL`;

let durations = [
    // Format is hh:mm:ss Ex: 00hours 00minutes 30 seconds //
    "00:00:30",
];

// If only one duration is defined, assign it to all streams
if (durations.length === 1) {
    durations = Array(streamLinks.length).fill(durations[0]);
}

// Ensure the directory exists, create it if it doesn't
if (!existsSync(RecFolder)) {
    mkdirSync(RecFolder, { recursive: true });
}

//--Iterate over each stream and call the recordAndPreviewStream function--//
for (let i = 0; i < streamLinks.length; i++) {
    const streamer = streamers[i];
    const outputPath = `${RecFolder}\\${streamer}\\${streamer}${Format}`;
    const streamFolder = `${RecFolder}\\${streamer}`;

    // Ensure the streamer's folder exists, create it if it doesn't
    if (!existsSync(streamFolder)) {
        mkdirSync(streamFolder, { recursive: true });
    }

    if (existsSync(outputPath)) {
        let counter = 2;
        let newOutputPath;
        do {
            newOutputPath = `${RecFolder}\\${streamer}\\${streamer}_${counter}${Format}`;
            counter++;
        } while (existsSync(newOutputPath));
        recordAndPreviewStream(streamLinks[i], newOutputPath, durations[i]);
    } else {
        recordAndPreviewStream(streamLinks[i], outputPath, durations[i]);
    }
}
