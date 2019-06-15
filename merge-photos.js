const path = require(`path`);
const spawnSync = require(`child_process`).spawnSync;
const glob = require(`glob`);
const fs = require(`fs-extra`);
const moment = require(`moment`);

//=============================================================================
// Settings

// Working directory
const workDirPath = `./work`;

// Number of images to be merged
const imagesNumber = 100;

//=============================================================================
// Params
if (process.argv.length !== 4) {
	console.error(`Usage: node merge-photos $masterDirPath $outputDirPath`);
	process.exit(1);
}

// A photos master directory path
const masterDirPath = process.argv[2];

// A directory path to save merged images
const outputDirPath = process.argv[3];

//=============================================================================
// Main

// File path list
const filePathList = glob.sync(`${masterDirPath}/**/*.?(jpg|png)`, { nocase: true });
let max = filePathList.length;
if (filePathList.length % imagesNumber) {
	max++;
}

// Run
for (let i = 0; i < filePathList.length; i += imagesNumber) {
	console.log(`--------------------------------------- ${i + 1}-${i + imagesNumber}`);

	// Make working directory
	if (!fs.existsSync(workDirPath)) {
		fs.mkdirSync(workDirPath);
	}

	// Resize
	let subSetFilePathList = filePathList.slice(i, i + imagesNumber);
	resize(subSetFilePathList);

	// Merge
	let time = moment(fs.statSync(subSetFilePathList[0]).mtimeMs);
	merge(time);

	// Remove
	outputResult(spawnSync(`rm`, [`-rf`, workDirPath]));
}

//=============================================================================
// Resize
function resize(filePathList) {
	filePathList.forEach(filePath => {
		const fileName = path.basename(filePath);
		const time = moment(fs.statSync(filePath).mtimeMs);
		const timestamp = time.format(`YYYY.MM.DD HH:mm:ss`);
		const outputFilePath = `${workDirPath}/${fileName}.jpg`;

		console.log(`${fileName} ${timestamp}`);
		outputResult(spawnSync(`convert`, [
			filePath,
			`-quality`,
			`100`,
			`-resize`,
			`640x480`,
			`-gravity`,
			`center`,
			`-extent`,
			`640x480 `,
			`-background`,
			`white`,
			`-fill`,
			`#0008`,
			`-draw`,
			`rectangle 540,471,640,480`,
			`-gravity`,
			`southeast`,
			`-fill`,
			`white`,
			`-pointsize`,
			`10`,
			`-draw`,
			`text -1,-2 '${timestamp}'`,
			outputFilePath,
		]));

		setTimestamp(outputFilePath, time);
	});
}

//=============================================================================
// Merge
function merge(time) {
	const outputFilePath = `${outputDirPath}/${time.format(`YYYYMMDD_HHmmss`)}.jpg`;
	outputResult(spawnSync(`montage`, [
		`${workDirPath}/*.jpg`,
		`-quality`,
		`62`,
		`-tile`,
		`10x10`,
		`-geometry`,
		`640x480`,
		outputFilePath,
	]));

	setTimestamp(outputFilePath, time);
}

//=============================================================================
// Set timestamp
function setTimestamp(filePath, time) {
	const timestamp = time.format(`YYYYMMDDHHmm.ss`);
	console.log(filePath, timestamp);
	outputResult(spawnSync(`touch`, [`-ct`, timestamp, filePath]));
	outputResult(spawnSync(`touch`, [`-mt`, timestamp, filePath]));
}

//=============================================================================
// Output spawn result
function outputResult(result) {
	if (!result) {
		return;
	}

	if (result.status !== 0 && result.stderr) {
		const message = result.stderr.toString().trim();
		if (message) {
			console.error(message);
		}
	}

	if (result.stdout) {
		const message = result.stdout.toString().trim();
		if (message) {
			console.log(message);
		}
	}
}
