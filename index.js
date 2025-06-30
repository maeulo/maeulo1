
import React, { useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const e = React.createElement;

const App = () => {
  const [extractedData, setExtractedData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [copyButtonText, setCopyButtonText] = useState('클립보드에 복사');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  const formatDataAsText = (data) => {
    return data.map(item => `Name: ${item.name}\nRole: ${item.role}\nContent: ${item.content}`).join('\n\n');
  };

  const processFile = useCallback((file) => {
    if (!file) return;

    if (!file.type.includes('json')) {
      setError('JSON 파일(.json)만 업로드할 수 있습니다.');
      setFileName('');
      setExtractedData([]);
      return;
    }
    
    setIsLoading(true);
    setFileName(file.name);
    setError('');
    setExtractedData([]);

    // Simulate processing time for large files
    setTimeout(() => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const jsonContent = event.target?.result;
            const data = JSON.parse(jsonContent);

            const findData = (obj) => {
              const results = [];
              
              const recurse = (current) => {
                if (!current) return;

                if (Array.isArray(current)) {
                  current.forEach(item => recurse(item));
                } else if (typeof current === 'object' && current !== null) {
                  if (
                    Object.prototype.hasOwnProperty.call(current, 'name') &&
                    Object.prototype.hasOwnProperty.call(current, 'role') &&
                    Object.prototype.hasOwnProperty.call(current, 'content')
                  ) {
                    results.push({ name: current.name, role: current.role, content: current.content });
                  } else {
                    for (const key in current) {
                      if (Object.prototype.hasOwnProperty.call(current, key)) {
                        recurse(current[key]);
                      }
                    }
                  }
                }
              };

              recurse(data);
              return results;
            };
            
            const foundData = findData(data);

            if (foundData.length === 0) {
                throw new Error("JSON 파일에서 'name', 'role', 'content' 키를 모두 포함하는 항목을 찾을 수 없습니다.");
            }

            setExtractedData(foundData);
          } catch (err) {
            setError(`파일 처리 중 오류가 발생했습니다: ${err.message}`);
            setFileName('');
            setExtractedData([]);
          } finally {
            setIsLoading(false);
          }
        };

        reader.onerror = () => {
          setError('파일을 읽는 데 실패했습니다.');
          setFileName('');
          setExtractedData([]);
          setIsLoading(false);
        };

        reader.readAsText(file);
    }, 500); // Artificial delay
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (isLoading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile, isLoading]);

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isLoading) {
      setIsDragging(true);
    }
  };
  
  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isLoading) {
        setIsDragging(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleCopyToClipboard = () => {
    if (extractedData.length === 0) return;
    const textToCopy = formatDataAsText(extractedData);
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopyButtonText('복사 완료!');
      setTimeout(() => setCopyButtonText('클립보드에 복사'), 2000);
    });
  };

  const handleSaveToFile = () => {
    if (extractedData.length === 0) return;
    const textToSave = formatDataAsText(extractedData);
    const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const originalFileName = fileName.replace(/\.[^/.]+$/, "");
    link.download = `${originalFileName}_extracted.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFileName('');
    setExtractedData([]);
    setError('');
    setIsLoading(false);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const renderUploadContent = () => {
    if (isLoading) {
        return e('div', { className: 'loading-spinner' });
    }
    if (!fileName) {
        return e('div', { className: 'upload-prompt' },
            e('label', { htmlFor: 'file-upload', className: 'btn btn-upload' },
              e('svg', { xmlns: "http://www.w3.org/2000/svg", width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                e('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
                e('polyline', { points: '17 8 12 3 7 8' }),
                e('line', { x1: '12', y1: '3', x2: '12', y2: '15' })
              ),
              e('span', null, '파일 선택')
            ),
            e('p', null, '또는 파일을 여기로 드래그하세요')
          );
    }
    return e('div', { className: 'file-display' },
        e('div', { className: 'file-info' },
          e('span', { className: 'file-icon' }, '📄'),
          e('span', { className: 'file-name' }, fileName)
        ),
        e('button', { onClick: handleReset, className: 'btn-reset', 'aria-label': '파일 제거' }, '×')
      );
  }

  return e('div', { className: 'app-container' },
    e('header', null,
      e('h1', null, 'JSON Content Extractor'),
      e('p', null, "JSON 파일에서 'name', 'role', 'content' 항목을 추출하여 하나의 텍스트로 만듭니다.")
    ),
    e('section', {
        className: `upload-section ${isDragging ? 'is-dragging' : ''}`,
        onDrop: handleDrop,
        onDragOver: handleDragOver,
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
      },
      e('input', {
        type: 'file',
        id: 'file-upload',
        accept: '.json',
        onChange: handleFileChange,
        ref: fileInputRef,
        disabled: isLoading,
      }),
      renderUploadContent()
    ),
    error && e('p', { className: 'error-message' }, error),
    extractedData.length > 0 && e('section', { className: 'results-section' },
      e('div', {
        className: 'results-text-content',
        'aria-label': '추출된 텍스트',
      }, 
        extractedData.map((item, index) => 
          e('div', { key: index, className: 'result-item' },
            e('p', { className: 'result-line name' }, item.name),
            e('p', { className: 'result-line role' }, item.role),
            e('p', { className: 'result-line content' }, item.content)
          )
        )
      ),
      e('div', { className: 'actions' },
        e('button', {
            onClick: handleCopyToClipboard,
            className: `btn btn-primary ${copyButtonText === '복사 완료!' ? 'success' : ''}`,
          },
          copyButtonText
        ),
        e('button', { onClick: handleSaveToFile, className: 'btn btn-secondary' }, '텍스트 파일로 저장')
      )
    )
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(e(App));
}
