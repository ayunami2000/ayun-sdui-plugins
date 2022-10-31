/*
 * ayunami2000's awesome vid2vid plugin for cmdr2's stable diffusion ui!! :D
 * source: https://github.com/ayunami2000/ayun-sdui-plugins
 * license: ^
 */
(function() {
	let fps = 5;
	let promptStrength = 0.5;

	const renderVideoBtn = document.createElement("button");
	renderVideoBtn.id = "renderVideoBtn"
	renderVideoBtn.innerText = "Make Video";
	const renderVideoBtnStyle = document.createElement("style");
	renderVideoBtnStyle.innerText = "#renderVideoBtn { flex: 0 0 70px; background: var(--accent-color); border: var(--make-image-border); color: rgb(255, 221, 255); width: 100%; height: 30pt; } #renderVideoBtn:hover { background: hsl(var(--accent-hue), 100%, calc(var(--accent-lightness) + 6%)); }";
	document.head.appendChild(renderVideoBtnStyle);
	renderVideoBtn.onclick = renderVideo;
	stopImageBtn.insertAdjacentElement("afterend", renderVideoBtn);

	const vidCanvas = document.createElement("canvas");
	const vidContext = vidCanvas.getContext("2d");
	const videoElem = document.createElement("video");
	let videoFrameProcess = -1;

	let originallyRandomSeed = true;
	let originalPromptStrength = 0.8;
	let originalMask = false;
	let originalNumOutputsTotal = 1;
	let originalNumOutputsParallel = 1;

	const renderCanvas = document.createElement("canvas");
	const renderContext = renderCanvas.getContext("2d");

	function renderVideo() {
		const frames = [...document.querySelectorAll(".img-preview .img-batch .imgItem .imgContainer img")].reverse();
		if (frames.length == 0) {
			return;
		}
		let i = 0;
		renderVideoBtn.setAttribute("disabled", "disabled");
		renderCanvas.width = frames[i].naturalWidth;
		renderCanvas.height = frames[i].naturalHeight;
		renderContext.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
		fps = prompt("Enter desired frames per second: ", fps) || fps;
		renderVideoBtn.innerText = "Rendering... (" + (Math.round(100 * frames.length / fps) / 100) + " seconds remaining)";
		const renderStream = renderCanvas.captureStream(fps);
		const mediaRecorder = new MediaRecorder(renderStream, { mimeType: "video/webm" });
		mediaRecorder.ondataavailable = function(e) {
			const downloadLink = document.createElement("a");
			downloadLink.download = Date.now() + "-" + Math.random() + ".webm";
			downloadLink.href = URL.createObjectURL(e.data);
			downloadLink.click();
			renderVideoBtn.innerText = "Make Video";
			renderVideoBtn.removeAttribute("disabled");
        };
		let renderInt = setInterval(function() {
			if (renderInt == -1) {
				return;
			}
			if (i >= frames.length) {
				clearInterval(renderInt);
				renderInt = -1;
				mediaRecorder.stop();
				return;
			}
			if (i > 0) {
				mediaRecorder.pause();
			}
			renderVideoBtn.innerText = "Rendering... (" + (Math.round(100 * ((frames.length - 1) - i) / fps) / 100) + " seconds remaining)";
			renderCanvas.width = frames[i].naturalWidth;
			renderCanvas.height = frames[i].naturalHeight;
			renderContext.drawImage(frames[i], 0, 0, renderCanvas.width, renderCanvas.height);
			if (i == 0) {
				mediaRecorder.start();
			}
			mediaRecorder.resume();
			i++;
		}, 1000 / fps);
	}

	function endVideoFrameProcess() {
		if (videoFrameProcess != -1) {
			randomSeedField.checked = originallyRandomSeed;
			randomSeedField.removeAttribute("disabled");
			promptStrengthField.value = originalPromptStrength;
			promptStrengthField.removeAttribute("disabled");
			maskSetting.checked = originalMask;
			maskSetting.removeAttribute("disabled");
			numOutputsTotalField.value = originalNumOutputsTotal;
			numOutputsTotalField.removeAttribute("disabled");
			numOutputsParallelField.value = originalNumOutputsParallel;
			numOutputsParallelField.removeAttribute("disabled");
		}
		videoFrameProcess = -1;
		videoElem.removeAttribute("src");
		videoElem.load();
		initImageSelector.value = "";
	}

	videoElem.setAttribute("muted", "muted");
	let seekResolve;
	videoElem.onseeked = function() {
		if (seekResolve) {
			seekResolve();
		}
	};
	videoElem.onplay = videoElem.onplaying = function(e) {
		e.preventDefault();
		videoElem.pause();
	};
	videoElem.onloadedmetadata = function() {
		// workaround chromium metadata bug (https://stackoverflow.com/q/38062864/993683)
		while ((videoElem.duration === Infinity || isNaN(videoElem.duration)) && videoElem.readyState < 2) {
			videoElem.currentTime = 10000000 * Math.random();
		}

		if (videoFrameProcess != -1) {
			return;
		}
		initImageSelector.removeAttribute("disabled");
		originallyRandomSeed = randomSeedField.checked;
		if (randomSeedField.checked) {
			seedField.value = Math.floor(Math.random() * 10000000);
		}
		randomSeedField.checked = false;
		randomSeedField.setAttribute("disabled", "disabled");
		originalPromptStrength = promptStrengthField.value;
		promptStrength = prompt("Enter desired prompt strength: ", promptStrength) || promptStrength;
		promptStrengthField.value = promptStrength;
		promptStrengthField.setAttribute("disabled", "disabled");
		originalMask = maskSetting.checked;
		maskSetting.checked = false;
		maskSetting.setAttribute("disabled", "disabled");
		originalNumOutputsTotal = numOutputsTotalField.value;
		numOutputsTotalField.value = 1;
		numOutputsTotalField.setAttribute("disabled", "disabled");
		originalNumOutputsParallel = numOutputsParallelField.value;
		numOutputsParallelField.value = 1;
		numOutputsParallelField.setAttribute("disabled", "disabled");
		fps = prompt("Enter desired frames per second: ", fps) || fps;
		videoFrameProcess = 1;

		// roughly based on https://stackoverflow.com/a/52357595/6917520

		let currentTime = 0;

		function fard() {
			if (currentTime >= videoElem.duration) {
				seekResolve = function() {};
				endVideoFrameProcess();
				return;
			}
			videoElem.currentTime = currentTime;
			seekResolve = function() {
				vidContext.drawImage(videoElem, 0, 0, vidCanvas.width, vidCanvas.height);
				initImagePreview.src = vidCanvas.toDataURL("image/png");
				makeImage();
	
				currentTime += 1 / fps;

				fard();
			};
		}

		fard();
	};
	videoElem.onerror = function() {
		initImageSelector.removeAttribute("disabled");
		if (videoFrameProcess != -1) {
			endVideoFrameProcess();
		}
	};

	initImageSelector.removeEventListener("change", showInitImagePreview);
	window.showInitImagePreview = function() {
		if (videoFrameProcess != -1) {
			endVideoFrameProcess();
		}

		if (initImageSelector.files.length == 0) {
			initImagePreviewContainer.style.display = "none";
			promptStrengthContainer.style.display = "none";
			return;
		}

		const file = initImageSelector.files[0];

		if (!file) {
			return;
		}

		// for now, do not support videos if the browser does not report the file type. todo: see how many browsers don't report file type
		const lowerFileType = file.type ? file.type.split("/")[0].toLowerCase() : "image";

		if (lowerFileType == "video") {
			videoElem.src = URL.createObjectURL(file);
			initImageSelector.setAttribute("disabled", "disabled");
			return;
		}
	
		const reader = new FileReader();
	
		reader.addEventListener("load", function() {
			initImagePreview.src = reader.result;
			initImagePreviewContainer.style.display = "block";
			inpaintingEditorContainer.style.display = "none";
			promptStrengthContainer.style.display = "table-row";
			samplerSelectionContainer.style.display = "none";
		});
	
		reader.readAsDataURL(file);
	};
	initImageSelector.addEventListener("change", window.showInitImagePreview);
})();