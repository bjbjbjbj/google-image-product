
import React, { useState, useEffect } from 'react';
import { UploadedImage, AppStatus, SavedStyle } from './types';
import { analyzeImages } from './services/geminiService';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import ResultView from './components/ResultView';

const HISTORY_KEY = 'prompt_architect_history';

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState<string>('Initializing analysis...');
  const [history, setHistory] = useState<SavedStyle[]>([]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (content: string, refImages: UploadedImage[]) => {
    const newEntry: SavedStyle = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      thumbnail: refImages[0]?.dataUrl || '',
      content: content,
      referenceImages: refImages
    };

    const updatedHistory = [newEntry, ...history].slice(0, 10); // Keep last 10
    setHistory(updatedHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  const deleteFromHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const loadHistoryItem = (item: SavedStyle) => {
    setResult(item.content);
    setImages(item.referenceImages);
    setStatus(AppStatus.COMPLETED);
  };

  const loadingMessages = [
    "Reading visual language...",
    "Extracting lighting geometry...",
    "Analyzing compositional balance...",
    "Decoding mood and atmosphere...",
    "Synthesizing generation prompts...",
    "Applying anti-artifact logic...",
    "Finalizing style specs..."
  ];

  const handleStartAnalysis = async () => {
    if (images.length === 0) return;
    
    setStatus(AppStatus.ANALYZING);
    setError('');
    
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      setLoadingStep(loadingMessages[msgIndex]);
    }, 2000);

    try {
      const output = await analyzeImages(images);
      setResult(output);
      saveToHistory(output, images);
      setStatus(AppStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Analysis failed. Please try again.');
      setStatus(AppStatus.ERROR);
    } finally {
      clearInterval(interval);
    }
  };

  const reset = () => {
    setImages([]);
    setStatus(AppStatus.IDLE);
    setResult('');
    setError('');
  };

  return (
    <div className="min-h-screen pb-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Header />

        <main className="space-y-8 mt-4">
          {status === AppStatus.IDLE || status === AppStatus.ERROR ? (
            <div className="space-y-10">
              <div className="glass rounded-3xl p-6 sm:p-10 border-white/5">
                <ImageUploader 
                  images={images} 
                  onImagesChange={setImages} 
                  disabled={status === AppStatus.ANALYZING} 
                />
                
                <div className="mt-10 flex flex-col items-center space-y-4">
                  <button
                    onClick={handleStartAnalysis}
                    disabled={images.length === 0 || status === AppStatus.ANALYZING}
                    className={`w-full sm:w-64 py-4 px-6 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-500/20 ${
                      images.length === 0 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white transform hover:-translate-y-1'
                    }`}
                  >
                    Reverse Engineer Style
                  </button>
                  {error && (
                    <p className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                      {error}
                    </p>
                  )}
                </div>
              </div>

              {history.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-lg font-bold flex items-center">
                      <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Recent Style Architectures
                    </h2>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Auto-Saved</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {history.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => loadHistoryItem(item)}
                        className="glass group cursor-pointer hover:border-indigo-500/30 transition-all rounded-2xl p-4 flex items-center space-x-4 border border-white/5 bg-white/[0.02]"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-white/5">
                          <img src={item.thumbnail} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="Style history" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate">
                            {new Date(item.timestamp).toLocaleDateString()} Style Profile
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                            {item.referenceImages.length} Reference Images
                          </p>
                        </div>
                        <button 
                          onClick={(e) => deleteFromHistory(e, item.id)}
                          className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : status === AppStatus.ANALYZING ? (
            <div className="glass rounded-3xl p-20 text-center space-y-8">
              <div className="flex justify-center">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Generating Prompt Agent</h3>
                <p className="text-slate-400 animate-pulse">{loadingStep}</p>
              </div>
              <div className="max-w-xs mx-auto h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-1/2 animate-[loading_2s_ease-in-out_infinite]"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={reset}
                  className="text-sm font-medium text-slate-400 hover:text-white flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 8.959 8.959 0 01-9 9m9-9H3" />
                  </svg>
                  <span>Home / New Style</span>
                </button>
                <div className="text-xs text-indigo-400 font-mono bg-indigo-400/10 px-3 py-1 rounded-full border border-indigo-400/20 uppercase tracking-tighter">
                  Reverse Engineering Complete
                </div>
              </div>
              
              <ResultView content={result} referenceImages={images} />
            </div>
          )}
        </main>

        <footer className="mt-20 text-center opacity-30 text-xs">
          <p>© 2024 Prompt Architect AI. Advanced Visual Analysis Engine.</p>
        </footer>
      </div>
      
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default App;
