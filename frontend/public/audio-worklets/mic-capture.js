// AudioWorklet: captures mic, downsamples to 16kHz mono PCM,
// posts ~80ms chunks to main thread, also reports per-block RMS for VAD.
class MicCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetSampleRate = opts.targetSampleRate || 16000;
    this.inputSampleRate = sampleRate; // global from AudioWorkletGlobalScope
    this.ratio = this.inputSampleRate / this.targetSampleRate;
    this.acc = [];
    // chunk = 80ms of 16k samples = 1280 samples
    this.chunkSize = Math.floor(this.targetSampleRate * 0.08);
    this.muted = false;
    this.port.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === "mute") this.muted = !!d.value;
    };
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    // compute RMS for VAD on the input block
    let sumSq = 0;
    for (let i = 0; i < ch.length; i++) sumSq += ch[i] * ch[i];
    const rms = Math.sqrt(sumSq / ch.length);
    this.port.postMessage({ type: "level", rms });

    if (this.muted) return true;

    // downsample to 16k (linear interpolation)
    const outLen = Math.floor(ch.length / this.ratio);
    for (let i = 0; i < outLen; i++) {
      const idx = i * this.ratio;
      const i0 = Math.floor(idx);
      const i1 = Math.min(ch.length - 1, i0 + 1);
      const f = idx - i0;
      const s = ch[i0] * (1 - f) + ch[i1] * f;
      this.acc.push(Math.max(-1, Math.min(1, s)));
    }
    while (this.acc.length >= this.chunkSize) {
      const chunk = this.acc.splice(0, this.chunkSize);
      const pcm = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        const v = chunk[i];
        pcm[i] = v < 0 ? Math.round(v * 0x8000) : Math.round(v * 0x7fff);
      }
      this.port.postMessage({ type: "chunk", pcm: pcm.buffer }, [pcm.buffer]);
    }
    return true;
  }
}
registerProcessor("mic-capture", MicCaptureProcessor);
