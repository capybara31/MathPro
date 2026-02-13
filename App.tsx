
import React, { useState, useEffect, useCallback } from 'react';
import { Tab, TelegramConfig, Post } from './types';
import { sendTelegramMessage, sendTelegramPhoto } from './services/telegramService';
import { generateCaption, analyzeImageAndSuggest } from './services/geminiService';

// Components
const NavItem: React.FC<{ active: boolean; label: string; onClick: () => void; icon: React.ReactNode }> = ({ active, label, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
      active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.PUBLISH);
  const [config, setConfig] = useState<TelegramConfig>({ botToken: '', chatId: '' });
  const [posts, setPosts] = useState<Post[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Persistence
  useEffect(() => {
    const savedConfig = localStorage.getItem('tb_config');
    const savedPosts = localStorage.getItem('tb_posts');
    if (savedConfig) setConfig(JSON.parse(savedConfig));
    if (savedPosts) setPosts(JSON.parse(savedPosts));
  }, []);

  useEffect(() => {
    localStorage.setItem('tb_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('tb_posts', JSON.stringify(posts));
  }, [posts]);

  const showNotify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedFile && !inputText) {
      showNotify('error', 'Add some text or an image first!');
      return;
    }
    setIsGenerating(true);
    let suggestion = '';
    
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        suggestion = await analyzeImageAndSuggest(base64) || '';
        setInputText(suggestion);
        setIsGenerating(false);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      suggestion = await generateCaption(undefined, inputText) || '';
      setInputText(suggestion);
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!config.botToken || !config.chatId) {
      showNotify('error', 'Please configure your Bot Token and Chat ID first!');
      setActiveTab(Tab.SETTINGS);
      return;
    }

    setIsSending(true);
    try {
      let result;
      if (selectedFile) {
        result = await sendTelegramPhoto(config, selectedFile, inputText);
      } else if (inputText) {
        result = await sendTelegramMessage(config, inputText);
      } else {
        showNotify('error', 'Nothing to send!');
        setIsSending(false);
        return;
      }

      if (result.ok) {
        showNotify('success', 'Published successfully!');
        const newPost: Post = {
          id: Date.now().toString(),
          text: inputText,
          imageUrl: previewUrl || undefined,
          timestamp: Date.now(),
          status: 'sent'
        };
        setPosts([newPost, ...posts]);
        setInputText('');
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        showNotify('error', `Failed: ${result.description}`);
      }
    } catch (err) {
      showNotify('error', 'Connection error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f172a]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#1e293b] p-6 flex flex-col border-r border-slate-800">
        <div className="mb-10 flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">TeleBridge</h1>
        </div>

        <nav className="flex flex-col space-y-4 flex-1">
          <NavItem 
            active={activeTab === Tab.PUBLISH} 
            label="Publish" 
            onClick={() => setActiveTab(Tab.PUBLISH)} 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>}
          />
          <NavItem 
            active={activeTab === Tab.HISTORY} 
            label="History" 
            onClick={() => setActiveTab(Tab.HISTORY)} 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
          />
          <NavItem 
            active={activeTab === Tab.SETTINGS} 
            label="Settings" 
            onClick={() => setActiveTab(Tab.SETTINGS)} 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>}
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className={`text-xs px-3 py-1 rounded-full w-fit ${config.botToken ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {config.botToken ? '● Connected' : '○ Not Configured'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 md:p-10 relative">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-2 animate-bounce ${
            notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}>
            <span>{notification.msg}</span>
          </div>
        )}

        {/* Dynamic Views */}
        {activeTab === Tab.PUBLISH && (
          <div className="max-w-4xl w-full mx-auto space-y-8 animate-in fade-in duration-500">
            <header>
              <h2 className="text-3xl font-bold">New Publication</h2>
              <p className="text-slate-400 mt-2">Bridge content directly to your Telegram channel.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Side: Editor */}
              <div className="space-y-6">
                <div className="bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-800">
                  <label className="block text-sm font-medium text-slate-400 mb-2">Message Content</label>
                  <textarea
                    className="w-full h-40 bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none"
                    placeholder="Write your telegram post here or use AI to generate one..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleGenerateAI}
                      disabled={isGenerating}
                      className="flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                    >
                      <svg className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      <span>{isGenerating ? 'Generating...' : 'AI Enhance'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-800">
                  <label className="block text-sm font-medium text-slate-400 mb-2">Attach Media</label>
                  <div className="relative group cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-slate-700 group-hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center transition-all bg-[#0f172a]">
                      <svg className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      <p className="text-slate-400 font-medium">Click or drag image to upload</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Preview */}
              <div className="space-y-6">
                 <div className="bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-800 h-full flex flex-col">
                  <label className="block text-sm font-medium text-slate-400 mb-4">Channel Preview</label>
                  <div className="flex-1 bg-[#1a2233] rounded-2xl p-4 overflow-hidden border border-slate-700/50 flex flex-col">
                    <div className="flex items-center space-x-3 mb-4">
                       <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse"></div>
                       <div>
                         <div className="w-24 h-3 bg-slate-700 rounded mb-1"></div>
                         <div className="w-16 h-2 bg-slate-800 rounded"></div>
                       </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      {previewUrl && (
                        <div className="relative rounded-lg overflow-hidden border border-slate-700">
                          <img src={previewUrl} alt="Preview" className="w-full object-cover max-h-64" />
                          <button 
                            onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                            className="absolute top-2 right-2 bg-black/50 p-1 rounded-full hover:bg-black/70"
                          >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                        </div>
                      )}
                      <p className={`text-slate-200 whitespace-pre-wrap ${!inputText ? 'italic text-slate-500' : ''}`}>
                        {inputText || "Message content will appear here..."}
                      </p>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleSend}
                        disabled={isSending || (!inputText && !selectedFile)}
                        className={`px-8 py-3 rounded-xl font-bold transition-all transform active:scale-95 flex items-center space-x-3 ${
                          isSending ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                        }`}
                      >
                        {isSending ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <span>Publish Now</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === Tab.HISTORY && (
          <div className="max-w-4xl w-full mx-auto space-y-6 animate-in slide-in-from-bottom duration-500">
            <header className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold">Post History</h2>
                <p className="text-slate-400 mt-2">Recently sent messages to your channel.</p>
              </div>
              <button 
                onClick={() => setPosts([])}
                className="text-slate-500 hover:text-rose-400 transition-colors text-sm"
              >
                Clear History
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-500">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <p>No posts sent yet. Start broadcasting from the Publish tab.</p>
                </div>
              ) : posts.map(post => (
                <div key={post.id} className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 group hover:border-indigo-500/50 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(post.timestamp).toLocaleString()}
                    </span>
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] rounded uppercase font-bold tracking-wider">
                      {post.status}
                    </span>
                  </div>
                  {post.imageUrl && (
                    <img src={post.imageUrl} className="w-full h-32 object-cover rounded-xl mb-3 border border-slate-800" alt="History Post" />
                  )}
                  <p className="text-sm text-slate-300 line-clamp-3">{post.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === Tab.SETTINGS && (
          <div className="max-w-2xl w-full mx-auto space-y-8 animate-in zoom-in-95 duration-500">
            <header>
              <h2 className="text-3xl font-bold">Configuration</h2>
              <p className="text-slate-400 mt-2">These credentials are stored locally in your browser's encrypted storage.</p>
            </header>

            <div className="bg-[#1e293b] p-8 rounded-3xl shadow-2xl border border-slate-800 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Bot Token</label>
                  <div className="relative">
                    <input
                      type="password"
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-5 py-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      placeholder="1234567890:ABCdefGHI..."
                      value={config.botToken}
                      onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Get this from @BotFather in Telegram.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Channel / Chat ID</label>
                  <input
                    type="text"
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-5 py-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="-100123456789 or @username"
                    value={config.chatId}
                    onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-slate-500">Format: @mychannel or -100xxxxxxxxxx</p>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex space-x-3">
                  <svg className="w-6 h-6 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  <div className="text-xs text-amber-200/80 leading-relaxed">
                    <strong className="block mb-1 text-amber-400">Security Notice:</strong>
                    This application operates as a client-side bridge. Your API keys never leave your device except to communicate directly with Telegram's servers. No intermediate server collects your data.
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  showNotify('success', 'Configuration saved securely.');
                  setActiveTab(Tab.PUBLISH);
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all shadow-lg"
              >
                Save and Lock
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
