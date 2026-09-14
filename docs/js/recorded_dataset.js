let syncedAudio = null;
const STORAGE_DIR = 'https://www2.informatik.uni-hamburg.de/sp/audio/publications/subspace-constrained-beamformer/data/office_recordings'
// const STORAGE_DIR = 'data/office_recordings'
const JSON_STORAGE_DIR = 'data/office_recordings'

export async function renderRecordedDatasetPane() {
  syncedAudio = null;
  await pauseAllMedia();

  const leftDynamic = document.getElementById('left-dynamic');
  leftDynamic.innerHTML = `
  <h2> Office meeting recordings </h3>

  <p class="block-text">
    <label for="recSelect">Choose recording:</label>
    <select id="recSelect">
    </select>
  </p>

  <h4> Recording setup </h4>
  <p class="block-text"> The recordings are conducted in an office/meeting room with a reverberation time of approx. 500ms.
  We use an Eigenmike em64 to obtain third order ambisonics coefficients for processing. 
  We rotate the sound scene to be centered at the seated, stationary speaker (<span class="legend-dot interferer-dot"></span>) in each recording.
  </p>

  <h4> Evaluation setup </h4>
  <p class="block-text">
  In each recording we enhance the moving target speaker (<span class="legend-dot target-dot"></span>). 
  To evaluate spatial fidelity, we localize both moving target (<span class="legend-dot target-dot"></span>) and stationary interfering (<span class="legend-dot interferer-dot"></span>) speaker based on the enhanced speech signal using the DoA estimator of [Nadiri'14]. We compute the localization error (MAE) solely toward the stationary interferer (<span class="legend-dot interferer-dot"></span>). Smoothed DoA estimates are indicated as arrows and obtained via the Wrapped Kalman Filter from [Traa'13].
  To evaluate monaural enhancement performance, we use omnidirectional decoding and evaluate the transcription of QuartzNet [Kriman'20] via WER.
  In case of ambisonics-to-ambisonics enhancement, the sound field is binauralized using a KEMAR HRTF.
  </p>
    
  `;

  const NUM_RECORDINGS = 1;
  const RECORDING_NAMES = [
    'reverb_half_15sec_v1_1',
    // 'reverb_half_20sec_v1_2'
  ];
  const arrowPositions = [
    {label:"2spk_v11_sina1", key: {1: { left: '10%', top: '35%' }, 2: { left: '55%', top: '35%' }}},
    {label:"2spk_v11_jakob2", key: {1: { left: '3%', top: '35%' }, 2: { left: '55%', top: '35%' }}},
    {label:"2spk_v33_jakob2", key: {1: { left: '5%', top: '35%' }, 2: { left: '55%', top: '35%' }}}
  ];
  const NUM_SPEAKERS = 2;
  const SPK_COLORS = ["#ff7f0e", "#1f77b4"];
  const SSF = 'SpatialNet';
  const TST = 'WrappedKF';
  const EXP_TYPES = [ 
    `${SSF.toLowerCase()}-fb`,
    `${SSF.toLowerCase()}-ar`,
    `${SSF.toLowerCase()}-fb-ar`
  ];


  const EXP_CONFIG = [
    [SSF, '\u2714', '\u2718'],
    [SSF, '\u2718', '\u2714'],
    [SSF, '\u2714', '\u2714'],
  ];

  const tickSize = '18px';
// width="854" height="480" 

  const rightPane = document.getElementById('right-pane');
  rightPane.innerHTML = `
    <div class="right-content">
    <div class="video-container"; style="position:relative; display:inline-block;">
    <video id="myVideo" muted controls> 
    <source id="videoSource" src="${STORAGE_DIR}/video_2spk_v11_jakob2.mp4" type="video/mp4">
    Your browser does not support the video tag.
    </video>
    <div class="overlay-wrapper">
    <video id="overlayVideo" muted playsinline style="opacity: 0;">
      <source id="overlaySource" source src="${STORAGE_DIR}/video_2spk_v11_jakob2.mp4" type="video/mp4" />
    </video>
  </div>
    <div id="arrowOverlay1"
       style="
         position:absolute; 
         left:200px; 
         top:100px; 
         width:0; 
         height:0;
         z-index:2;
         pointer-events:none;">
    <!-- Example: SVG arrow -->
    <svg width="70" height="70">
      <polygon points="0,0 60,0 30,60" fill="none" />
    </svg>
  </div>
  <div id="arrowOverlay2"
  style="
    position:absolute; 
    left:200px; 
    top:100px; 
    width:0; 
    height:0;
    z-index:2;
    pointer-events:none;">
<!-- Example: SVG arrow -->
<svg width="70" height="70">
 <polygon points="0,0 60,0 30,60" fill="none" />
</svg>
</div>
  <div id="videoLabel"
  style="
    position: absolute;
    left: 10%;
    top: 25px;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    padding: 2px 10px;
    border-radius: 5px;
    font-size: 20px;
    z-index:3;">
</div>
<div id="subtitle"
style="
    position: absolute;
    left: 10%;
    bottom: 25px;
    transform: translateX(-0%);
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    padding: 2px 10px;
    border-radius: 5px;
    font-size: 20px;
    z-index:3;">
  </div>
</div>

<!-- Three-position selector -->
<div class="mode-slider-container">
  <input
    id="modeSlider"
    type="range"
    min="0"
    max="2"
    step="1"
    value="0"
  >

  <div class="mode-slider-labels">
    <span>\u03BD = 0</span>
    <span>\u03BD = 10</span>
    <span>\u03BD \u2192 \u221E</span>
  </div>
</div>

<div class="recorded-grid" id="recordedGrid"></div>
    </div>
  `;

  const select = document.getElementById('recSelect');
  const RECORDINGS = [
    {
      label: "recording_0",
      key: ["reverb_low", "2spk_v11_jakob2"]
    },
    {
      label: "recording_1",
      key: ["reverb_low", "2spk_v33_jakob2"]
    },
  ];
  RECORDINGS.forEach((rec, index) => {
    const option = document.createElement('option');
    option.value = index;        // store index only
    option.textContent = rec.label;
    select.appendChild(option);
  });
  const idx = select && select.value !== "" ? select.value : 1;
  const videoSource = document.getElementById('videoSource');
  const overlaySource = document.getElementById('overlaySource');

  const modeSlider = document.getElementById('modeSlider');
  const subtitle = document.getElementById('subtitle');
  subtitle.style.display = 'none';

  let subtitles = [];

  function updateAll() {

    const selectedRec = RECORDINGS[select.value];

    const selectedRoom = selectedRec.key[0];
    const selectedFile = selectedRec.key[1];

    let nu = 0;
    let nuString = "\u03BD = 0";

    const setting = Number(modeSlider.value);

    if (setting === 0) {
      nu = 0;
      nuString = "\u03BD = 0";
    } else if (setting === 1) {
      nu = 10;
      nuString = "\u03BD = 10";
    } else if (setting === 2) {
      nu = "max";
      nuString = "\u03BD \u2192 \u221E";
    }
    
    syncedAudio = null;


      // // table with recorded metrics
      // // --------------------------------------------------------------
      // const recordedMetrics = document.getElementById('recordedMetrics')
      // recordedMetrics.innerHTML = "";
      // // First header row
      // let header1 = document.createElement('tr');

      // // "Metrics" header across SSF, TST, AR-TST, AR-SSF (4 columns)
      // let thMetrics = document.createElement('th');
      // thMetrics.colSpan = 3;
      // thMetrics.innerText = "Metrics";
      // header1.appendChild(thMetrics);

      // // "WER ↓" across 3 columns (Speakers 1-3)
      // let thWER = document.createElement('th');
      // thWER.colSpan = NUM_SPEAKERS;
      // thWER.innerText = "WER \u2193";
      // header1.appendChild(thWER);

      // recordedMetrics.appendChild(header1);

      // // Second header row
      // let header2 = document.createElement('tr');
      // // SSF, TST, AR-TST, AR-SSF (each just 1 col, under "Metrics")
      // ["Mask Estimator", "FB", "AR"].forEach(metric => {
      //   let th = document.createElement('th');
      //   th.innerText = metric;
      //   header2.appendChild(th);
      // });

      // for (let j = 0; j<1; j++){
      // for (let i = 0; i < NUM_SPEAKERS; i++) {
      //   let dot = document.createElement('span');
      //   dot.style.display = 'inline-block';
      //   dot.style.width = '12px';
      //   dot.style.height = '12px';
      //   dot.style.borderRadius = '50%';
      //   dot.style.marginRight = '8px';
      //   dot.style.backgroundColor = SPK_COLORS[i] || "#bbbbbb"; // fallback color
      //   let dot_td = document.createElement('td');
      //   dot_td.appendChild(dot)
      //   header2.appendChild(dot_td);
      // }
      // recordedMetrics.appendChild(header2);
      // }     

      // // metrics of noisy input
      // let noisy = document.createElement('tr');
      // // SSF, TST, AR-TST, AR-SSF (each just 1 col, under "Metrics")
      // for (let i=0; i < EXP_CONFIG[0].length; i++){
      //     let th = document.createElement('th');
      //     th.innerText = '-';
      //     noisy.appendChild(th);
      // }
  //     for (let i = 0; i < NUM_SPEAKERS; i++) {
  //     fetch(`${JSON_STORAGE_DIR}/${EXP_TYPES[0]}/input_${selectedFile}_spk${i}.json`)
  //       .then(response => response.json())
  //       .then(data => {
        
  //         let metricValue2 = document.createElement('td');
  //         metricValue2.innerText = data['nisqa'].toFixed(2);
  //         noisy.appendChild(metricValue2);
  //     })
  // }

//   for (let i = 0; i < NUM_SPEAKERS; i++) {
//     fetch(`${JSON_STORAGE_DIR}/${EXP_TYPES[0]}/input_${selectedFile}_spk${i}.json`)
//       .then(response => response.json())
//       .then(data => {
    

//         let metricValue3 = document.createElement('td');
//         metricValue3.innerText = (data['wer'] * 100).toFixed(1);
//         noisy.appendChild(metricValue3);
//     })
// }
//       recordedMetrics.appendChild(noisy);

//       let rowPromises = [];

//         for (let type_idx = 0; type_idx < EXP_TYPES.length; type_idx++) {
//           let type = EXP_TYPES[type_idx];
//           // let config = EXP_CONFIG[type_idx]; // to reuse below
//           let config = [...EXP_CONFIG[type_idx]];

//           // Build a row (do not append yet!)
//           let valuesRow = document.createElement('tr');
//           config.forEach(item => {
//             let td = document.createElement('td');
//             td.innerText = item;
//             if (item === '\u2714') {
//               td.style.color = 'green';
//               td.style.fontSize = tickSize;
//             } else if (item === '\u2718') {
//               td.style.color = 'red';
//               td.style.fontSize = tickSize;
//             }
//             valuesRow.appendChild(td);
//           });

//       let fetchPromises = [];

// for (let i = 0; i < NUM_SPEAKERS; i++) {
//   fetchPromises.push(
//     fetch(`${JSON_STORAGE_DIR}/${type}/enhanced_${selectedFile}_spk${i}.json`)
//       .then(res => res.json())
//   );
// }

// Promise.all(fetchPromises).then(results => {
  
//   // WER columns (ordered)
//   results.forEach(data => {
//     let werTd = document.createElement('td');
//     werTd.innerText = (data['wer'] * 100).toFixed(1);
//     valuesRow.appendChild(werTd);
//   });

//   recordedMetrics.appendChild(valuesRow);
// });
        
//         }

      // --------------------------------------------------------------

      // Audio examples table
      recordedGrid.innerHTML = '';

      // Sticky Audio titles
      let headerRow = document.createElement('div');
      headerRow.className = 'recorded-header-row';

      ["Audio type", "Unprocessed", `SM (${nuString})`, `SC-SM (proposed, ${nuString})`].forEach(type => {
        let headerCell = document.createElement('div');
        headerCell.className = 'recorded-header-cell';
        headerCell.innerText = type;
        headerRow.appendChild(headerCell);
      });
      // for(let spk=1; spk<=NUM_SPEAKERS; spk++) {
      //   let headerCell = document.createElement('div');
      //   headerCell.className = 'recorded-header-cell';

      //   // let title = document.createElement('h4');
      //   // title.className = 'speaker-title';
      //   let dot = document.createElement('span');
      //   dot.style.display = 'inline-block';
      //   dot.style.width = '12px';
      //   dot.style.height = '12px';
      //   dot.style.borderRadius = '50%';
      //   dot.style.marginRight = '8px';

      //   // Decide color based on spk
      //   dot.style.backgroundColor = SPK_COLORS[spk-1] || "#bbbbbb"; // fallback color
      //   let pair = document.createElement('span');
      //   pair.style.display = 'inline-flex';
      //   pair.style.alignItems = 'center';

      //   pair.appendChild(dot);
      //   pair.appendChild(document.createTextNode(`Speaker ${spk}`));
      //   headerCell.appendChild(pair);

      //   headerRow.appendChild(headerCell);
      // }
      recordedGrid.appendChild(headerRow);

      // add noisy audio
      // let row = document.createElement('div');


      // row.className = 'recorded-row';
      // for (let i=0; i<EXP_CONFIG[0].length; i++) {
      //   let col = document.createElement('div');
      //   col.className = 'recorded-column';
      //   col.innerText = '-';
      //   row.appendChild(col);
      // }
      // for (let spk=0; spk<NUM_SPEAKERS; spk++) {
      //   let col = document.createElement('div');
      //   col.className = 'recorded-column';
      //   let audio = document.createElement('audio');
      //   audio.src = `${STORAGE_DIR}/noisy_2spk_v11_jakob2/orthomvdr-nu_max/input_stereo.wav`;
      //   audio.controls = true;
      //   audio.dataset.speaker = spk;
      //   audio.isNoisy = true;
      //   col.appendChild(audio);
      //   row.appendChild(col);
      // }
      // recordedGrid.appendChild(row);

      // add binaural audio
      let row = document.createElement('div')
      row.className = 'recorded-row';

      let col = document.createElement('div');
      col.className = 'recorded-column';
      col.innerText = 'Binaural';
      row.appendChild(col);

      ["input", "mvdr", "orthomvdr"].forEach(type => {
        let col = document.createElement('div');
          col.className = 'recorded-column';

        // Create outer container for image and controls
        let container = document.createElement('div');
        container.className = 'spectrogram-with-controls';

        let controlsRow = document.createElement('div');
        controlsRow.className = 'spectrogram-controls-row';

        // add enhanced speech
        let audio = document.createElement('audio');
        if (type === 'input'){
          audio.src = `${STORAGE_DIR}/noisy_${selectedFile}/orthomvdr-nu_${nu}/input_stereo.wav`;
        } else if (type === 'mvdr') {  
          audio.src = `${STORAGE_DIR}/noisy_${selectedFile}/${type}-nu_${nu}/est_stereo.wav`;
        } else {
          audio.src = `${STORAGE_DIR}/noisy_${selectedFile}/${type}-nu_${nu}/est_stereo.wav`;
        }
        audio.isBinaural = true;
        audio.isNoisy = true;

        audio.controls = true;
        // audio.dataset.speaker = spk;
        audio.dataset.type = type;
        // audio.dataset.type_idx = type_idx;
        
        col.appendChild(audio);
        col.appendChild(container);

        row.appendChild(col);

      });

    recordedGrid.appendChild(row);

    // add monaural audio
    let mono_row = document.createElement('div')
    mono_row.className = 'recorded-row';

    let mono_col = document.createElement('div');
    mono_col.className = 'recorded-column';
    mono_col.innerText = 'Monaural';
    mono_row.appendChild(mono_col);

    ["input", "mvdr", "orthomvdr"].forEach(type => {
      let col = document.createElement('div');
        col.className = 'recorded-column';

      // Create outer container for image and controls
      let container = document.createElement('div');
      container.className = 'spectrogram-with-controls';

      let controlsRow = document.createElement('div');
      controlsRow.className = 'spectrogram-controls-row';

      // add enhanced speech
      let audio = document.createElement('audio');
      if (type === 'input'){
        audio.src = `${STORAGE_DIR}/noisy_${selectedFile}/orthomvdr-nu_${nu}/input_mono.wav`;
      } else if (type === 'mvdr') {
        audio.src = `${STORAGE_DIR}/noisy_${selectedFile}/${type}-nu_${nu}/est_mono.wav`;
      } else {
        audio.src = `${STORAGE_DIR}/noisy_${selectedFile}/${type}-nu_${nu}/est_mono.wav`;
      }
      audio.controls = true;
      // audio.dataset.speaker = spk;
      audio.dataset.type = type;
      // audio.dataset.type_idx = type_idx;
      audio.isNoisy = true;
      audio.isBinaural = false;
      col.appendChild(audio);
      col.appendChild(container);

      mono_row.appendChild(col);

    });

  recordedGrid.appendChild(mono_row);

  // const modeSlider = document.getElementById('modeSlider');
      

  // enhanced signals 
  // for(let type_idx=0; type_idx<EXP_TYPES.length; type_idx++) {
  //   let type = EXP_TYPES[type_idx];

  //     // Create a row div
  //     let row = document.createElement('div');
  //     row.className = 'recorded-row';

  //     // Add experiment config
  //     EXP_CONFIG[type_idx].forEach(metric => {
  //       let col = document.createElement('div');
  //       col.className = 'recorded-column';
  //       col.innerText = metric;
  //       if (metric === '\u2714') {
  //         col.style.color = 'green';
  //         col.style.fontSize = tickSize;
  //       } else if (metric === '\u2718') {
  //         col.style.color = 'red';
  //         col.style.fontSize = tickSize;
  //       }
  //       row.append(col)
  //     });
      
  //     // Add experiment columns for each speaker
  //     for(let spk=1; spk<=NUM_SPEAKERS; spk++) {
  //         let col = document.createElement('div');
  //         col.className = 'recorded-column';

  //       // Create outer container for image and controls
  //       let container = document.createElement('div');
  //       container.className = 'spectrogram-with-controls';

  //       let controlsRow = document.createElement('div');
  //       controlsRow.className = 'spectrogram-controls-row';

  //       // add enhanced speech
  //       let audio = document.createElement('audio');
  //       audio.src = `${STORAGE_DIR}/noisy_2spk_v11_jakob2/orthomvdr-nu_max/input_stereo.wav`;
  //       audio.controls = true;
  //       audio.dataset.speaker = spk;
  //       audio.dataset.type = type;
  //       audio.dataset.type_idx = type_idx;
  //       audio.isNoisy = false;
  //       col.appendChild(audio);
  //       col.appendChild(container);

  //       row.appendChild(col);

  //       }
  //     recordedGrid.appendChild(row);
  //   };
  // };
    let videoElem = document.getElementById('myVideo');
    let overlayVideo = document.getElementById('overlayVideo');
    let audioElems = Array.from(recordedGrid.querySelectorAll('audio'));

    overlayVideo.style.opacity = 0.0;

    // Remove controls to make video unplayable on its own
    videoElem.removeAttribute('controls');

    // Prevent any user-initiated play, pause, seeking
    videoElem.addEventListener('play', function(e) {
      if (!syncedAudio || syncedAudio.paused) {
        e.preventDefault();
        videoElem.pause();
      }
    });

    videoElem.addEventListener('seeking', function(e){
      if (!syncedAudio || syncedAudio.paused) {
        e.preventDefault();
        videoElem.currentTime = 0;
      }
    });

    videoElem.addEventListener('click', e => {
      e.preventDefault();
      return false;
    });

    // Optionally block keyboard controls
    videoElem.addEventListener('keydown', e => {
      e.preventDefault();
      return false;
    });


    videoElem.addEventListener('timeupdate', () => {
      if (!syncedAudio || syncedAudio.isBinaural) {
        subtitle.style.display = 'none';
        return;
      }
    
      const t = videoElem.currentTime;
      const cue = subtitles.find(
        s => t >= s.start && t <= s.end
      );
    
      if (cue) {
        subtitle.innerText = cue.text;
        subtitle.style.display = 'block';
      } else {
        subtitle.style.display = 'none';
      }
    });



    // set arrow
    const arrow1 = document.getElementById('arrowOverlay1');
    const arrow2 = document.getElementById('arrowOverlay2');
    videoElem.ontimeupdate = function() {
      if (videoElem.currentTime <= 1.5) {
        // arrow.style.position = arrowPositions[audio.dataset.type_idx].key
        arrow1.style.display = 'block';
        arrow2.style.display = 'block';
      } else {
        arrow1.style.display = 'none';
        arrow2.style.display = 'none';
      }
    };

    // Track which audio (if any) is the "currently paired" audio
    // let syncedAudio = null;

    audioElems.forEach(audio => {
      audio.addEventListener('play', () => {
        // 1. Pause all other audios immediately
        audioElems.forEach(a => { if (a !== audio && !a.paused) a.pause(); });

        // update position

        // When a new audio is played, update video source
        if (audio.isBinaural){
          let newOverlaySrc = ""
          if (audio.dataset.type === 'input'){
            newOverlaySrc = `${STORAGE_DIR}/noisy_${selectedFile}/mvdr-nu_max/trajectory.mp4`;
          } else {
            newOverlaySrc = `${STORAGE_DIR}/noisy_${selectedFile}/${audio.dataset.type}-nu_${nu}/trajectory.mp4`;
          }
          overlaySource.src = newOverlaySrc;
          overlayVideo.style.opacity = 0.75;
          overlaySource.parentNode.load();
        } else {
          overlayVideo.style.opacity = 0.0;
        };
    
        // 2. If another audio was playing, need to wait for its 'pause' event to complete, or do the rest after a small delay.
        setTimeout(() => {
          syncedAudio = audio;
    
          // Sync video to current audio and play
          videoElem.currentTime = audio.currentTime;
          if (videoElem.paused) videoElem.play();
          overlayVideo.currentTime = audio.currentTime;
          if (overlayVideo.paused) overlayVideo.play();

          // load metrics
          let metricPath = ""
          if (audio.dataset.type === 'input'){
            metricPath = `${JSON_STORAGE_DIR}/noisy_${selectedFile}/orthomvdr-nu_${nu}/input_metrics.json`
          } else {
            metricPath = `${JSON_STORAGE_DIR}/noisy_${selectedFile}/${audio.dataset.type}-nu_${nu}/est_metrics.json`
          }

          fetch(metricPath)
            .then(response => response.json())
            .then(metricData => {

               // Video description update
          const arrow1 = document.getElementById('arrowOverlay1');
          const arrow2 = document.getElementById('arrowOverlay2');
          const label = document.getElementById('videoLabel');
          const polygon1 = arrow1.querySelector('polygon');
          const polygon2 = arrow2.querySelector('polygon');
          let color1;
          let color2;
          if (!audio.isBinaural) {
            const entry = arrowPositions.find(d => d.label === selectedFile);
            arrow1.style.left = entry.key[1].left;
            arrow1.style.top  = entry.key[1].top;
            color1 = SPK_COLORS[0];
            color2 = 'none';
            label.innerText = `WER ${(metricData['wer'] * 100).toFixed(1)}%`;
          } else {
            label.innerText = `MAE ${metricData['mae'].toFixed(1)}°`;
            const entry = arrowPositions.find(d => d.label === selectedFile);
            arrow1.style.left = entry.key[1].left;
            arrow1.style.top  = entry.key[1].top;
            arrow2.style.left = entry.key[2].left;
            arrow2.style.top  = entry.key[2].top;
            color1 = SPK_COLORS[0];
            color2 = SPK_COLORS[1];
          }
          polygon1.setAttribute('fill', color1);
          polygon2.setAttribute('fill', color2);
          })


          // load subtitles
          let subPath = ""
          if (audio.dataset.type === 'input'){
            subPath = `${JSON_STORAGE_DIR}/noisy_${selectedFile}/orthomvdr-nu_${nu}/input_subtitles.json`
          } else {
            subPath = `${JSON_STORAGE_DIR}/noisy_${selectedFile}/${audio.dataset.type}-nu_${nu}/est_subtitles.json`
          }
          fetch(subPath)
            .then(response => response.json())
            .then(data => {
              subtitles = data;
            });

          

          
        }, 30); // 30ms is typically enough for the event loop to finish pausing others
      });
    
      audio.addEventListener('pause', () => {
        if (!videoElem.paused) videoElem.pause();
        if (!overlayVideo.paused) overlayVideo.pause();
      });
    
      audio.addEventListener('seeked', () => {
        videoElem.currentTime = audio.currentTime;
        overlayVideo.currentTime = audio.currentTime;
      });
    });


    // When a new audio is played, update video source (if needed)
    let newVideoSrc = `${STORAGE_DIR}/video_${selectedFile}.mp4`;
    videoSource.src = newVideoSrc;
    videoSource.parentNode.load();
  };
  
    window.addEventListener('load', synchronizeRowHeights);
      setTimeout(synchronizeRowHeights, 500); // Extra after metrics fill in

  function synchronizeRowHeights() {
    // For each recorded-row
    document.querySelectorAll('.recorded-row').forEach(function(row){
      // Collect direct recorded-column children
      const columns = Array.from(row.children).filter(el => el.classList.contains('recorded-column'));
      // Reset heights for measurement
      columns.forEach(col => col.style.height = '');
      // Find the tallest
      const maxHeight = Math.max(...columns.map(col => col.offsetHeight));
      // Set all columns in the row to the tallest
      columns.forEach(col => col.style.height = maxHeight + "px");
    });
  }

  select.addEventListener('change', updateAll);

  modeSlider.addEventListener('input', updateAll);

  updateAll();

}

async function pauseAllMedia() {
  // Pause and reset all audios
  syncedAudio = null;
  await Promise.all(Array.from(document.querySelectorAll('audio')).map(async audio => {
      // Pause returns a Promise in modern browsers
      await audio.pause();
      audio.currentTime = 0;
  }));
  // Pause and reset video if present
  const video = document.getElementById('myVideo');
  if (video) {
      await video.pause();
      video.currentTime = 0;
  }
}