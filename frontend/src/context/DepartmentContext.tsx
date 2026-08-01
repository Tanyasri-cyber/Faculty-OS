import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { api } from '../services/api';

const DEPARTMENTS = [
  'All Departments',
  'Computer and Communication Engineering',
  'Computer Science & Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
];

interface DepartmentContextType {
  selectedDept: string;
  setSelectedDept: (dept: string) => void;
  departments: string[];
  isUploading: boolean;
  uploadMessage: string | null;
  setUploadMessage: (msg: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  triggerUpload: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  refreshTrigger: number;
}

const DepartmentContext = createContext<DepartmentContextType>({
  selectedDept: 'Computer and Communication Engineering',
  setSelectedDept: () => {},
  departments: DEPARTMENTS,
  isUploading: false,
  uploadMessage: null,
  setUploadMessage: () => {},
  fileInputRef: { current: null },
  triggerUpload: () => {},
  handleFileUpload: () => {},
  refreshTrigger: 0,
});

export const DepartmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDept, setSelectedDept] = useState('Computer and Communication Engineering');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadMessage(null);
    try {
      const res = await api.uploadAcademicFile(file);
      setUploadMessage(`✓ ${res.message}`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setUploadMessage(`✗ ${err.message || 'File upload failed'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  return (
    <DepartmentContext.Provider value={{
      selectedDept,
      setSelectedDept,
      departments: DEPARTMENTS,
      isUploading,
      uploadMessage,
      setUploadMessage,
      fileInputRef,
      triggerUpload,
      handleFileUpload,
      refreshTrigger,
    }}>
      {children}
    </DepartmentContext.Provider>
  );
};

export const useDepartment = () => useContext(DepartmentContext);
