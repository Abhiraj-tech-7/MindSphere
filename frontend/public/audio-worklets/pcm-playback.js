// AudioWorklet: ring-buffer playback of 24kHz PCM16 chunks from Gemini.
// Receives ArrayBuffers via port and streams them out at the context's sample rate.
class PcmPlaybackProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.inSampleRate = opts.inSampleRate || 24000;
    this.outSampleRate = sampleRate;
    this.ratio = this.inSampleRate / this.outSampleRate; // input samples consumed per output sample
    this.buffer = [];               // Float32 samples queue
    this.position = 0;              // fractional read pos
    this.playing = false;
    this.port.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === "chunk" && d.pcm) {
        const i16 = new Int16Array(d.pcm);
        for (let i = 0; i < i16.length; i++) {
          this.buffer.push(i16[i] / 0x8000);
        }
        this.playing = true;
      } else if (d.type === "flush") {
        this.buffer.length = 0;
        this.position = 0;
        this.playing = false;
        this.port.postMessage({ type: "drained" });
      }
    };
  }
  process(_inputs, outputs) {
    const out = outputs[0][0];
    if (!out) return true;
    if (!this.playing || this.buffer.length === 0) {
      out.fill(0);
      return true;
    }
    let i = 0;
    while (i < out.length) {
      const idx = this.position;
      const i0 = Math.floor(idx);
      const i1 = i0 + 1;
      if (i1 >= this.buffer.length) {
        // need more data — emit silence for remainder
        for (; i < out.length; i++) out[i] = 0;
        // drop everything before i0 to keep buffer small
        if (i0 > 0) {
          this.buffer.splice(0, i0);
          this.position = idx - i0;
        }
        if (this.buffer.length < 2) {
          this.playing = false;
          this.port.postMessage({ type: "drained" });
        }
        return true;
      }
      const f = idx - i0;
      out[i] = this.buffer[i0] * (1 - f) + this.buffer[i1] * f;
      this.position += this.ratio;
      i++;
    }
    // periodically prune the buffer
    const drop = Math.floor(this.position);
    if (drop > 1024) {
      this.buffer.splice(0, drop);
      this.position -= drop;
    }
    return true;
  }
}
registerProcessor("pcm-playback", PcmPlaybackProcessor);
