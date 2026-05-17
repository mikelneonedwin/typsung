/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error essentia.js might not have types
import Essentia from 'essentia.js/dist/essentia.js-core.es.js';
// @ts-expect-error essentia.js might not have types
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';

let essentia: any;

export async function parseAudioForBass(audioBuffer: AudioBuffer) {
  if (!essentia) {
    console.log("Initializing Essentia with direct imports...");
    
    let wasmModule = EssentiaWASM;
    
    // Some versions of EssentiaWASM are functions that return a promise
    if (typeof wasmModule === 'function') {
      wasmModule = await wasmModule();
    }
    
    // In some build environments, the module is nested under .default
    if (wasmModule && !wasmModule.EssentiaJS && (wasmModule as any).default) {
      wasmModule = (wasmModule as any).default;
    }
    
    // If it's still not right, it might be that EssentiaWASM was already the module
    // but the import was weird.
    
    try {
      essentia = new Essentia(wasmModule);
      console.log("Essentia initialized successfully");
    } catch (e) {
      console.error("Failed to initialize Essentia. wasmModule keys:", Object.keys(wasmModule || {}));
      throw e;
    }
  }
  
  // 1. Create vectors
  const channelData = audioBuffer.getChannelData(0);
  const signalVector = essentia.arrayToVector(channelData);
  
  // 2. LowPass Filter
  // Signature: LowPass(signal, cutoffFrequency, sampleRate)
  let filteredSignal;
  try {
    filteredSignal = essentia.LowPass(signalVector, 150, audioBuffer.sampleRate).signal;
  } catch(e) {
    console.error("Error in LowPass", e);
    throw e;
  }
  
  const frameSize = 1024;
  const hopSize = 512;
  
  // 3. FrameGenerator
  // Signature: FrameGenerator(inputAudioData, frameSize, hopSize)
  let frames;
  try {
    frames = essentia.FrameGenerator(essentia.vectorToArray(filteredSignal), frameSize, hopSize);
  } catch(e) {
    console.error("Error in FrameGenerator", e);
    throw e;
  }
  const onsetEnergies = [];
  
  for (let i = 0; i < frames.size(); i++) {
    let frame;
    try { frame = frames.get(i); } catch(e) { console.error("Error getting frame", i, e); throw e; }
    
    // 4. Spectrum
    // Signature: Spectrum(frame, size)
    let spectrumObj;
    try {
      spectrumObj = essentia.Spectrum(frame, frameSize);
    } catch(e) {
      console.error("Error in Spectrum", e);
      throw e;
    }
    const spectrum = spectrumObj.spectrum;
    
    // 5. OnsetDetection
    // Signature: OnsetDetection(spectrum, phase, method, sampleRate)
    const phase = essentia.arrayToVector([]); 
    let odObj;
    try {
      odObj = essentia.OnsetDetection(spectrum, phase, 'energy', audioBuffer.sampleRate);
    } catch(e) {
      console.error("Error in OnsetDetection", e);
      throw e;
    }
    const od = odObj.onset;
    
    onsetEnergies.push(od);
    
    // Cleanup loop vectors
    essentia.deleteVector(frame);
    essentia.deleteVector(spectrum);
    essentia.deleteVector(phase);
  }
  
  // 6. PeakDetection
  // Signature: PeakDetection(array, interpolate, maxPeaks, maxPosition, minPeakDistance, minPosition, orderBy, range, threshold)
  const onsetEnergiesVector = essentia.arrayToVector(onsetEnergies);
  let peaksObj;
  try {
    peaksObj = essentia.PeakDetection(
      onsetEnergiesVector,
      true,   // interpolate
      1000,   // maxPeaks
      onsetEnergies.length, // maxPosition
      0,      // minPeakDistance
      0,      // minPosition
      'position', // orderBy
      onsetEnergies.length, // range
      0.05    // threshold
    );
  } catch(e) {
    console.error("Error in PeakDetection", e);
    throw e;
  }
  const peaks = peaksObj.position;
  
  const timestamps = peaks.map((pos: number) => (pos * hopSize) / audioBuffer.sampleRate);
  
  // Final cleanup
  essentia.deleteVector(signalVector);
  essentia.deleteVector(filteredSignal);
  essentia.deleteVector(onsetEnergiesVector);
  if (typeof frames.delete === 'function') frames.delete();
  
  return timestamps;
}
