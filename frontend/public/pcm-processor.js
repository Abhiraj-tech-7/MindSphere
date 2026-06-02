// PCM 16-bit @ 16kHz worklet processor for Gemini Live API microphone input.
class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.inputSampleRate = (options && options.processorOptions && options.processorOptions.inputSampleRate) || sampleRate;
    this.targetRate = 16000;
    this.ratio = this.inputSampleRate / this.targetRate;
    this.buf = [];
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) this.buf.push(ch[i]);
    const outLen = Math.floor(this.buf.length / this.ratio);
    if (outLen < 320) return true; // ~20ms @16kHz
    const out = new Int16Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const idx = i * this.ratio;
      const i0 = Math.floor(idx);
      const i1 = Math.min(i0 + 1, this.buf.length - 1);
      const frac = idx - i0;
      const s = this.buf[i0] * (1 - frac) + this.buf[i1] * frac;
      const clamped = Math.max(-1, Math.min(1, s));
      out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }
    this.buf = this.buf.slice(Math.floor(outLen * this.ratio));
    this.port.postMessage(out.buffer, [out.buffer]);
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
