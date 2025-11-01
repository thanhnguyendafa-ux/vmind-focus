import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { UploadIcon, ImageIcon, TrashIcon, GoogleIcon } from './Icons';

interface ImageInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  onRemove: () => void;
  currentValue: string | null;
  searchTerm?: string;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
};

const ImageInputModal: React.FC<ImageInputModalProps> = ({ isOpen, onClose, onSave, onRemove, currentValue, searchTerm }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
    const [url, setUrl] = useState('');
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setPreview(currentValue);
            if (currentValue && (currentValue.startsWith('http') || currentValue.startsWith('https'))) {
                setUrl(currentValue);
                setActiveTab('url');
            } else {
                setUrl('');
                setActiveTab('upload');
            }
            setError(null);
        }
    }, [isOpen, currentValue]);

    const handleFileChange = async (file: File | null) => {
        setError(null);
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setError("File is too large. Please select an image under 2MB.");
                return;
            }
            try {
                const base64 = await fileToBase64(file);
                setPreview(base64);
            } catch (e) {
                setError("Could not read file.");
            }
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newUrl = e.target.value;
        setUrl(newUrl);
        setError(null);
        // Basic validation for preview
        if (newUrl.startsWith('http')) {
            setPreview(newUrl);
        } else {
            setPreview(null);
        }
    };
    
    const handleSave = () => {
        if (preview && !error) {
            onSave(preview);
            onClose();
        }
    };

    const handleRemove = () => {
        onRemove();
        onClose();
    }
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    }
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Image">
            <div className="flex flex-col">
                <div className="flex border-b border-slate-200 mb-4">
                    <button onClick={() => setActiveTab('upload')} className={`py-2 px-4 text-sm font-semibold ${activeTab === 'upload' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500'}`}>Upload File</button>
                    <button onClick={() => setActiveTab('url')} className={`py-2 px-4 text-sm font-semibold ${activeTab === 'url' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500'}`}>From URL</button>
                </div>

                <div className="flex-grow min-h-[250px] flex items-center justify-center bg-slate-100 rounded-lg mb-4 overflow-hidden">
                    {preview && !error ? (
                        <img src={preview} alt="Preview" className="max-w-full max-h-64 object-contain" onError={() => { if(preview && preview.startsWith('http')) setError('Could not load image from URL.')}} />
                    ) : (
                        <div className="text-center text-slate-400">
                           <ImageIcon className="w-16 h-16 mx-auto" />
                           <p>Image Preview</p>
                        </div>
                    )}
                </div>

                {activeTab === 'upload' && (
                    <div 
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="border-2 border-dashed rounded-lg p-6 text-center transition-colors border-slate-300 bg-slate-50"
                    >
                        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] || null)} accept="image/*" />
                        <UploadIcon className="mx-auto h-10 w-10 text-slate-400" />
                        <button onClick={() => fileInputRef.current?.click()} className="mt-2 font-semibold text-cyan-600 hover:text-cyan-500 cursor-pointer">
                           Choose a file
                        </button>
                        <p className="text-xs text-slate-500">or drag and drop</p>
                    </div>
                )}
                
                {activeTab === 'url' && (
                    <div className="space-y-4">
                        {searchTerm && (
                            <button
                                onClick={() => window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchTerm)}`, '_blank')}
                                className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                            >
                                <GoogleIcon className="w-5 h-5" />
                                Search for "{searchTerm}" on Google Images
                            </button>
                        )}
                        <div>
                            <label htmlFor="image-url" className="text-sm font-semibold text-slate-700 mb-1 block">Image URL</label>
                            <input
                                id="image-url"
                                type="text"
                                value={url}
                                onChange={handleUrlChange}
                                placeholder="https://example.com/image.png"
                                className="w-full px-3 py-2 text-slate-700 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                    </div>
                )}

                {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
                
                <div className="flex justify-between items-center gap-4 pt-6 mt-4 border-t">
                    {currentValue ? (
                         <button onClick={handleRemove} className="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                             <TrashIcon className="w-5 h-5"/> Remove Image
                         </button>
                    ) : <div />}
                    <div className="flex gap-4">
                        <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg">Cancel</button>
                        <button onClick={handleSave} disabled={!preview || !!error} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-slate-300">Save</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ImageInputModal;