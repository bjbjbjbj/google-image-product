
import React, { useRef } from 'react';
import { UploadedImage } from '../types';

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  disabled: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onImagesChange, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fix: Explicitly type 'files' as File[] to resolve 'unknown' type errors on lines 28 and 33
    const files: File[] = Array.from(e.target.files || []);
    if (files.length + images.length > 10) {
      alert("You can only upload up to 10 images.");
      return;
    }

    if (files.length === 0) return;

    const newImages: UploadedImage[] = [];
    let processedCount = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          // Fix: 'file' is now correctly recognized as a File object by TypeScript
          newImages.push({
            id: Math.random().toString(36).substr(2, 9),
            dataUrl: event.target.result as string,
            mimeType: file.type
          });
        }
        
        processedCount++;
        // Batch updates to avoid potential race conditions and state inconsistencies during multi-file processing
        if (processedCount === files.length) {
          onImagesChange([...images, ...newImages]);
        }
      };
      // Fix: 'file' is now correctly typed, fulfilling the 'Blob' requirement for readAsDataURL
      reader.readAsDataURL(file);
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  };

  return (
    <div className="w-full">
      <div 
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ${
          disabled ? 'opacity-50 border-slate-700' : 'border-indigo-500/50 hover:border-indigo-400 hover:bg-indigo-500/5'
        } flex flex-col items-center justify-center cursor-pointer`}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          multiple 
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <svg className="w-12 h-12 text-indigo-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <p className="text-slate-300 font-medium">Click to upload reference images</p>
        <p className="text-slate-500 text-sm mt-1">1-10 images supported • JPG, PNG, WEBP</p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-6">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden glass border border-white/10">
              <img src={img.dataUrl} alt="Reference" className="w-full h-full object-cover" />
              {!disabled && (
                <button 
                  onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
