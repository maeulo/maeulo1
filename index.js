
import React, { useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const e = React.createElement;

const App = () => {
  const [extractedText, setExtractedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [copyButtonText, setCopyButtonText] = useState('클립보드에 복사');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = useCallback((file) => {
    if (!file) return;

    if (!file.type.includes('json')) {
      setError('JSON 파일(.json)만 업로드할 수 있습니다.');
      setFileName('');
      setExtractedText('');
      return;
    }

    setFileName(file.name);
    setError('');
    setExtractedText('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result;
        const data = JSON.parse(jsonContent);

        const findAllContent = (obj) => {
          const contents = [];
          
          const recurse = (current) => {
            if (!current) return;

            if (Array.isArray(current)) {
              current.forEach(item => recurse(item));
            } else if (typeof current === 'object') {
              for (const key in current) {
                if (Object.prototype.hasOwnProperty.call(current, key)) {
                  if (key === 'content' && (typeof current[key] === 'string' || typeof current[key] === 'number')) {
                    contents.push(String(current[key]));
                  } else {
                    recurse(current[key]);
                  }
                }
              }
            }
          };

          recurse(data);
          return contents;
        };
        
        const contentArray = findAllContent(data);

        if (contentArray.length === 0) {
            throw new Error("JSON 파일에서 'content' 키를 가진 항목을 찾을 수 없습니다.");
        }

        setExtractedText(contentArray.join('\n\n'));
      } catch (err) {
        setError(`파일 처리 중 오류가 발생했습니다: ${err.message}`);
        setFileName('');
        setExtractedText('');
      }
    };

    reader.onerror = () => {
      setError('파일을 읽는 데 실패했습니다.');
      setFileName('');
      setExtractedText('');
    };

    reader.readAsText(file);
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
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleCopyToClipboard = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText).then(() => {
      setCopyButtonText('복사 완료!');
      setTimeout(() => setCopyButtonText('클립보드에 복사'), 2000);
    });
  };

  const handleSaveToFile = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
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
    setExtractedText('');
    setError('');
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return e('div', { className: 'app-container' },
    e('header', null,
      e('h1', null, 'JSON Content Extractor'),
      e('p', null, 'JSON 파일에서 \'content\' 항목을 추출하여 하나의 텍스트로 만듭니다.')
    ),
    e('section', {
        className: `upload-section ${isDragging ? 'is-dragging' : ''}`,
        onDrop: handleDrop,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
      },
      e('input', {
        type: 'file',
        id: 'file-upload',
        accept: '.json',
        onChange: handleFileChange,
        ref: fileInputRef,
      }),
      !fileName
        ? e('div', { className: 'upload-prompt' },
            e('label', { htmlFor: 'file-upload', className: 'btn btn-upload' },
              e('svg', { xmlns: "http://www.w3.org/2000/svg", width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                e('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
                e('polyline', { points: '17 8 12 3 7 8' }),
                e('line', { x1: '12', y1: '3', x2: '12', y2: '15' })
              ),
              e('span', null, '파일 선택')
            ),
            e('p', null, '또는 파일을 여기로 드래그하세요')
          )
        : e('div', { className: 'file-display' },
            e('div', { className: 'file-info' },
              e('span', { className: 'file-icon' }, '📄'),
              e('span', { className: 'file-name' }, fileName)
            ),
            e('button', { onClick: handleReset, className: 'btn-reset', 'aria-label': '파일 제거' }, '×')
          )
    ),
    error && e('p', { className: 'error-message' }, error),
    extractedText && e('section', { className: 'results-section' },
      e('div', {
        className: 'results-text-content',
        'aria-label': '추출된 텍스트',
      }, extractedText),
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
