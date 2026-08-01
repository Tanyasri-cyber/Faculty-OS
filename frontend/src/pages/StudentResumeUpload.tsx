import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentResumeUpload() {
  const [rollNo, setRollNo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !rollNo) {
      setMessage('Please provide both your Roll Number and a Resume PDF.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setMessage('');

    const formData = new FormData();
    formData.append('student_roll_no', rollNo);
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/resume/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(`Success! We've extracted your skills: ${data.skills}`);
        setFile(null);
        setRollNo('');
      } else {
        setStatus('error');
        setMessage(data.detail || 'Upload failed. Please ensure your Roll Number is correct.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Could not connect to the server.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700"
      >
        <div className="p-8">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-2xl mb-6 mx-auto">
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            Placement & Internship Portal
          </h2>
          <p className="text-center text-slate-400 mb-8">
            Upload your latest resume to automatically match with upcoming campus drives.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                University Roll Number
              </label>
              <input
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g. 21CS101"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Resume (PDF only)
              </label>
              <div className="relative border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:bg-slate-700/50 transition-colors">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                {file ? (
                  <p className="text-blue-400 font-medium truncate">{file.name}</p>
                ) : (
                  <p className="text-slate-400">Click or drag PDF to upload</p>
                )}
              </div>
            </div>

            {status === 'error' && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'uploading'}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {status === 'uploading' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                'Submit Resume'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
