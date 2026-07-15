/**
 * MATLAB-to-Python cheat sheet for signal processing engineers.
 * Organized by category; each row maps a MATLAB idiom to its Python equivalent.
 */
export interface CheatRow {
  matlab: string;
  python: string;
  note?: string;
}

export interface CheatCategory {
  id: string;
  title: string;
  description: string;
  rows: CheatRow[];
}

export const CHEAT_SHEET: CheatCategory[] = [
  {
    id: "setup",
    title: "Environment & Imports",
    description: "Standard imports every signal processing script starts with. Unlike MATLAB, Python requires explicit imports.",
    rows: [
      { matlab: "% toolboxes auto-loaded", python: "import numpy as np", note: "Universal convention" },
      { matlab: "% Signal Processing Toolbox", python: "from scipy import signal", note: "scipy.signal ≈ SP Toolbox" },
      { matlab: "% plotting built-in", python: "import matplotlib.pyplot as plt" },
      { matlab: "help fft", python: "help(np.fft.fft)  /  np.fft.fft?", note: "? works in IPython/Jupyter" },
      { matlab: "clear; clc", python: "%reset (IPython) — rarely needed", note: "Each script run starts fresh" },
      { matlab: "addpath('lib')", python: "import sys; sys.path.append('lib')", note: "Prefer packages/venv" },
    ],
  },
  {
    id: "arrays",
    title: "Array Creation & Indexing",
    description: "The biggest mental shift: NumPy is 0-indexed, uses [] for indexing, and slices exclude the end point.",
    rows: [
      { matlab: "x = [1 2 3]", python: "x = np.array([1, 2, 3])" },
      { matlab: "x = zeros(1,N)", python: "x = np.zeros(N)", note: "1-D by default, no row/col distinction" },
      { matlab: "x = ones(M,N)", python: "x = np.ones((M, N))", note: "Shape is a tuple" },
      { matlab: "x = 0:0.1:1", python: "x = np.arange(0, 1.1, 0.1)", note: "arange EXCLUDES stop" },
      { matlab: "x = linspace(0,1,100)", python: "x = np.linspace(0, 1, 100)", note: "linspace INCLUDES stop" },
      { matlab: "x(1)", python: "x[0]", note: "0-based indexing!" },
      { matlab: "x(end)", python: "x[-1]" },
      { matlab: "x(2:5)", python: "x[1:5]", note: "Slice end is exclusive" },
      { matlab: "x(1:2:end)", python: "x[::2]" },
      { matlab: "x(end:-1:1)", python: "x[::-1]", note: "Reverse" },
      { matlab: "x(x > 0)", python: "x[x > 0]", note: "Boolean masking works the same" },
      { matlab: "A(2,3)", python: "A[1, 2]" },
      { matlab: "A(:,1)", python: "A[:, 0]" },
      { matlab: "size(A)", python: "A.shape", note: "Tuple, not array" },
      { matlab: "numel(x)", python: "x.size" },
      { matlab: "length(x)", python: "len(x)  /  x.shape[0]" },
    ],
  },
  {
    id: "operators",
    title: "Operators & Linear Algebra",
    description: "NumPy operators are element-wise by default — the opposite of MATLAB, where * is matrix multiply.",
    rows: [
      { matlab: "A .* B", python: "A * B", note: "Element-wise is the DEFAULT" },
      { matlab: "A * B", python: "A @ B", note: "Matrix multiply uses @" },
      { matlab: "A ./ B", python: "A / B" },
      { matlab: "A .^ 2", python: "A ** 2" },
      { matlab: "A'", python: "A.conj().T", note: "MATLAB ' is conjugate transpose" },
      { matlab: "A.'", python: "A.T", note: "Plain transpose (no conjugate)" },
      { matlab: "inv(A)", python: "np.linalg.inv(A)", note: "Prefer np.linalg.solve(A, b)" },
      { matlab: "A \\ b", python: "np.linalg.solve(A, b)", note: "Or lstsq for non-square" },
      { matlab: "eig(A)", python: "np.linalg.eig(A)  /  eigvals(A)" },
      { matlab: "svd(A)", python: "np.linalg.svd(A)" },
      { matlab: "norm(x)", python: "np.linalg.norm(x)" },
      { matlab: "kron(A,B)", python: "np.kron(A, B)" },
    ],
  },
  {
    id: "complex",
    title: "Complex & IQ Signals",
    description: "Complex baseband work translates directly; watch the dtype and the 1j literal.",
    rows: [
      { matlab: "z = 3 + 4i", python: "z = 3 + 4j", note: "j suffix, or complex(3,4)" },
      { matlab: "real(z), imag(z)", python: "z.real, z.imag" },
      { matlab: "abs(z), angle(z)", python: "np.abs(z), np.angle(z)" },
      { matlab: "conj(z)", python: "np.conj(z)  /  z.conj()" },
      { matlab: "exp(1i*2*pi*f*t)", python: "np.exp(1j*2*np.pi*f*t)" },
      { matlab: "complex(randn(1,N),randn(1,N))", python: "rng.standard_normal(N) + 1j*rng.standard_normal(N)", note: "rng = np.random.default_rng()" },
      { matlab: "x = single(x)", python: "x = x.astype(np.complex64)", note: "complex64 = 2×float32 (SDR data)" },
      { matlab: "unwrap(angle(z))", python: "np.unwrap(np.angle(z))" },
    ],
  },
  {
    id: "fft",
    title: "FFT & Spectral Analysis",
    description: "np.fft mirrors MATLAB's fft conventions (unnormalized forward, 1/N inverse).",
    rows: [
      { matlab: "X = fft(x)", python: "X = np.fft.fft(x)", note: "Same normalization" },
      { matlab: "x = ifft(X)", python: "x = np.fft.ifft(X)" },
      { matlab: "fftshift(X)", python: "np.fft.fftshift(X)" },
      { matlab: "f = (-N/2:N/2-1)*fs/N", python: "f = np.fft.fftshift(np.fft.fftfreq(N, 1/fs))" },
      { matlab: "pwelch(x,w,novl,nfft,fs)", python: "f, Pxx = signal.welch(x, fs, nperseg=..., noverlap=...)", note: "Returns (f, Pxx) tuple" },
      { matlab: "spectrogram(x,...)", python: "f, t, Sxx = signal.spectrogram(x, fs)", note: "Or signal.ShortTimeFFT" },
      { matlab: "hann(N)", python: "signal.windows.hann(N)" },
      { matlab: "xcorr(x,y)", python: "signal.correlate(x, y, mode='full')", note: "Note: no normalization by default" },
    ],
  },
  {
    id: "filtering",
    title: "Filter Design & Filtering",
    description: "scipy.signal covers nearly all of the Signal Processing Toolbox filter design functions.",
    rows: [
      { matlab: "b = fir1(N, Wn)", python: "b = signal.firwin(N+1, Wn)", note: "firwin takes NUMTAPS = order+1" },
      { matlab: "b = firpm(N, f, a)", python: "b = signal.remez(N+1, bands, desired, fs=fs)" },
      { matlab: "[b,a] = butter(N, Wn)", python: "sos = signal.butter(N, Wn, output='sos')", note: "Use SOS for stability" },
      { matlab: "y = filter(b, a, x)", python: "y = signal.lfilter(b, a, x)" },
      { matlab: "y = filtfilt(b, a, x)", python: "y = signal.sosfiltfilt(sos, x)", note: "Zero-phase" },
      { matlab: "freqz(b, a)", python: "w, h = signal.freqz(b, a, fs=fs)" },
      { matlab: "grpdelay(b, a)", python: "w, gd = signal.group_delay((b, a), fs=fs)" },
      { matlab: "y = resample(x, p, q)", python: "y = signal.resample_poly(x, p, q)", note: "Polyphase, like MATLAB resample" },
      { matlab: "y = decimate(x, R)", python: "y = signal.decimate(x, R, ftype='fir')" },
      { matlab: "y = upfirdn(h, x, p, q)", python: "y = signal.upfirdn(h, x, p, q)" },
      { matlab: "conv(x, h)", python: "np.convolve(x, h)  /  signal.fftconvolve(x, h)" },
    ],
  },
  {
    id: "comms",
    title: "Communications Operations",
    description: "Comms Toolbox functions usually need a few lines of NumPy — here are the standard recipes.",
    rows: [
      { matlab: "randi([0 1], 1, N)", python: "bits = rng.integers(0, 2, N)" },
      { matlab: "qammod(sym, M, 'gray')", python: "Build LUT: const[gray_index]", note: "Covered in Day 6 lesson" },
      { matlab: "awgn(x, snr, 'measured')", python: "n = sqrt(Pn/2)*(randn+1j*randn); y = x + n", note: "Pn = Px / 10**(snr/10)" },
      { matlab: "berawgn(EbN0, 'psk', 2)", python: "0.5*erfc(sqrt(10**(EbN0/10)))", note: "from scipy.special import erfc" },
      { matlab: "rcosdesign(beta, span, sps)", python: "Custom RRC function", note: "Implemented in Day 7 lesson" },
      { matlab: "comm.RayleighChannel", python: "h = sqrt(1/2)*(randn+1j*randn)", note: "Flat fading; TDL for selective" },
      { matlab: "pskmod(x, 4, pi/4)", python: "np.exp(1j*(np.pi/4 + np.pi/2*x))" },
      { matlab: "biterr(tx, rx)", python: "np.sum(tx != rx), np.mean(tx != rx)" },
    ],
  },
  {
    id: "plotting",
    title: "Plotting",
    description: "Matplotlib's pyplot API was deliberately modeled on MATLAB — most commands map one-to-one.",
    rows: [
      { matlab: "figure", python: "plt.figure()" },
      { matlab: "plot(t, x)", python: "plt.plot(t, x)" },
      { matlab: "plot(t, x, 'r--o')", python: "plt.plot(t, x, 'r--o')", note: "Same format strings!" },
      { matlab: "subplot(2,2,1)", python: "fig, axs = plt.subplots(2, 2)", note: "Then axs[0,0].plot(...)" },
      { matlab: "hold on", python: "(default behavior)", note: "Each plot() call overlays" },
      { matlab: "xlabel('t'); title('x')", python: "plt.xlabel('t'); plt.title('x')" },
      { matlab: "legend('a','b')", python: "plt.legend(['a','b'])", note: "Better: plot(label='a')" },
      { matlab: "grid on", python: "plt.grid(True)" },
      { matlab: "semilogy(f, P)", python: "plt.semilogy(f, P)" },
      { matlab: "scatter(real(z),imag(z))", python: "plt.scatter(z.real, z.imag, s=4)" },
      { matlab: "imagesc(S)", python: "plt.imshow(S, aspect='auto', origin='lower')" },
      { matlab: "colorbar", python: "plt.colorbar()" },
      { matlab: "saveas(gcf,'f.png')", python: "plt.savefig('f.png', dpi=150)" },
    ],
  },
  {
    id: "control",
    title: "Control Flow & Functions",
    description: "Python uses indentation instead of end keywords, and functions live in modules rather than one-per-file.",
    rows: [
      { matlab: "for k = 1:N ... end", python: "for k in range(N):", note: "k runs 0..N-1" },
      { matlab: "while cond ... end", python: "while cond:" },
      { matlab: "if x > 0 ... elseif ... end", python: "if x > 0: ... elif ...:" },
      { matlab: "function y = f(x)", python: "def f(x): return y" },
      { matlab: "function [a,b] = f(x)", python: "return a, b", note: "Tuple unpacking: a, b = f(x)" },
      { matlab: "f = @(x) x.^2", python: "f = lambda x: x**2" },
      { matlab: "nargin / default args", python: "def f(x, fs=1.0):", note: "Native default arguments" },
      { matlab: "try ... catch ME ... end", python: "try: ... except Exception as e:" },
      { matlab: "error('bad input')", python: "raise ValueError('bad input')" },
      { matlab: "fprintf('%.2f dB\\n', x)", python: "print(f'{x:.2f} dB')", note: "f-strings" },
      { matlab: "struct('fs', 1e6)", python: "{'fs': 1e6} / @dataclass", note: "dicts or dataclasses" },
      { matlab: "cell array {1, 'a'}", python: "[1, 'a']", note: "Lists are heterogeneous" },
    ],
  },
  {
    id: "io",
    title: "Data I/O & Workspace",
    description: "scipy.io bridges directly to .mat files, easing the migration.",
    rows: [
      { matlab: "save('d.mat','x','fs')", python: "scipy.io.savemat('d.mat', {'x': x, 'fs': fs})" },
      { matlab: "load('d.mat')", python: "d = scipy.io.loadmat('d.mat'); x = d['x'].squeeze()", note: "Arrays come back 2-D — squeeze!" },
      { matlab: "csvwrite / writematrix", python: "np.savetxt('d.csv', x, delimiter=',')" },
      { matlab: "csvread / readmatrix", python: "np.loadtxt('d.csv', delimiter=',')" },
      { matlab: "fread(fid,'int16')", python: "np.fromfile('iq.bin', dtype=np.int16)", note: "Raw SDR captures" },
      { matlab: "whos", python: "%whos (IPython)" },
      { matlab: "tic; ...; toc", python: "import time; t0=time.perf_counter(); ...", note: "Or %timeit in IPython" },
    ],
  },
];
