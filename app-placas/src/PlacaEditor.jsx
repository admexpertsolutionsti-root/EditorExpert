import { useState, useRef, useEffect } from 'react';
import { 
  Printer, 
  Image as ImageIcon, 
  ImagePlus,
  Palette, 
  Type, 
  Move, 
  Trash2, 
  Settings2,
  Link,
  Unlink,
  QrCode,
  ZoomIn,
  Save,
  Upload,
  FolderOpen,
  FileText,
  Monitor,
  Sliders,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Layers,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

// Constantes de dimensões padrão ISO 216 em milímetros
const PAPER_SIZES = {
  A3: { name: 'A3', width: 297, height: 420 },
  A4: { name: 'A4', width: 210, height: 297 },
  A5: { name: 'A5', width: 148, height: 210 },
};

// 10 Fontes Padrão mais utilizadas
const DEFAULT_FONTS = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Georgia', value: 'Georgia, serif' }
];

const App = () => {
  // Estados Gerais do Papel e Zoom
  const [paperSize, setPaperSize] = useState('A4');
  const [customPaper, setCustomPaper] = useState({ width: 110, height: 30 }); // Padrão etiqueta de gôndola
  const [orientation, setOrientation] = useState('landscape'); 
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgImage, setBgImage] = useState(null);
  const [bgImageMode, setBgImageMode] = useState('cover');
  const [bgImageOpacity, setBgImageOpacity] = useState(100);
  const [zoom, setZoom] = useState(1); 
  
  // Estados dos Elementos, Seleção e Fontes Customizadas
  const [elements, setElements] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [customFonts, setCustomFonts] = useState([]);
  const [googleFontInput, setGoogleFontInput] = useState('');
  const [qrInput, setQrInput] = useState(''); 
  
  // Estados de UI
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [guides, setGuides] = useState({ centerX: false, centerY: false, elementX: null, elementY: null, edgeX: null, edgeY: null });
  const [activeMobileView, setActiveMobileView] = useState('controls'); // 'controls' ou 'canvas'
  
  // Refs
  const dragItem = useRef(null);
  const rotateItem = useRef(null); 
  const paperRef = useRef(null);
  const printAreaRef = useRef(null);

  // Calcula largura e altura ativas em milímetros
  const getBaseDimensions = () => {
    if (paperSize === 'Custom') return customPaper;
    return PAPER_SIZES[paperSize];
  };

  const baseDims = getBaseDimensions();
  const activeWidth = orientation === 'portrait' ? baseDims.width : baseDims.height;
  const activeHeight = orientation === 'portrait' ? baseDims.height : baseDims.width;

  // Lógica de Projeto
  const resetProject = () => {
    setPaperSize('A4');
    setCustomPaper({ width: 110, height: 30 });
    setOrientation('landscape');
    setBgColor('#ffffff');
    setBgImage(null);
    setBgImageMode('cover');
    setBgImageOpacity(100);
    setZoom(1);
    setElements([]);
    setSelectedIds([]);
  };

  const handleNewProject = () => {
    if (elements.length > 0 || bgImage || bgColor !== '#ffffff') {
      setShowNewConfirm(true);
    } else {
      resetProject();
    }
  };

  const handleSaveAndNew = () => {
    handleSaveProject();
    resetProject();
    setShowNewConfirm(false);
  };

  const handleDiscardAndNew = () => {
    resetProject();
    setShowNewConfirm(false);
  };

  const handleSaveProject = () => {
    const projectData = {
      paperSize, customPaper, orientation, bgColor,
      bgImage, bgImageMode, bgImageOpacity,
      elements, customFonts
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "meu_layout.expert");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleLoadProject = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const projectData = JSON.parse(event.target.result);
        
        if (projectData.paperSize) setPaperSize(projectData.paperSize);
        if (projectData.customPaper) setCustomPaper(projectData.customPaper);
        if (projectData.orientation) setOrientation(projectData.orientation);
        if (projectData.bgColor) setBgColor(projectData.bgColor);
        if (projectData.bgImage !== undefined) setBgImage(projectData.bgImage);
        if (projectData.bgImageMode) setBgImageMode(projectData.bgImageMode);
        if (projectData.bgImageOpacity !== undefined) setBgImageOpacity(projectData.bgImageOpacity);
        if (projectData.elements) setElements(projectData.elements);
        
        if (projectData.customFonts) {
          setCustomFonts(projectData.customFonts);
          projectData.customFonts.forEach(font => {
            const formattedName = font.label.replace(/\s+/g, '+');
            const link = document.createElement('link');
            link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@400;700;900&display=swap`;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
          });
        }
        
        setSelectedIds([]); 
        setZoom(1); 
        setActiveMobileView('canvas'); 
      } catch (err) {
        console.error("Ops! O arquivo selecionado não é um projeto válido.", err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  // Lógica de Gerenciamento de Camadas (Z-Index Reordering)
  const moveLayer = (id, direction) => {
    setElements(prev => {
      const index = prev.findIndex(el => el.id === id);
      if (index < 0) return prev;
      
      const newElements = [...prev];
      
      // Trazer para frente (sobe no array)
      if (direction === 'up' && index < prev.length - 1) {
        [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      }
      // Enviar para trás (desce no array)
      else if (direction === 'down' && index > 0) {
        [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      }
      
      return newElements;
    });
  };

  // Drag and Drop do Windows
  const handleDragOver = (e) => e.preventDefault();
  const handleDragEnter = (e) => {
    e.preventDefault();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDraggingOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDraggingOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      const newIds = [];
      const newElementsToAdd = [];

      imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newElement = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            type: 'image',
            src: event.target.result,
            name: file.name, // <-- Extrai e salva o nome original do arquivo arrastado
            x: 50 + (index * 2),
            y: 50 + (index * 2),
            width: 30,
            opacity: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
          };
          newElementsToAdd.push(newElement);
          newIds.push(newElement.id);
          
          if (newElementsToAdd.length === imageFiles.length) {
            setElements(prev => [...prev, ...newElementsToAdd]);
            setSelectedIds(newIds);
            setActiveMobileView('canvas'); 
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Zoom via Scroll
  useEffect(() => {
    const area = printAreaRef.current;
    if (!area) return;

    const handleWheel = (e) => {
      if (!e.shiftKey) {
        e.preventDefault();
        const zoomChange = e.deltaY * -0.002;
        setZoom(z => Math.max(0.2, Math.min(z + zoomChange, 10))); 
      }
    };

    area.addEventListener('wheel', handleWheel, { passive: false });
    return () => area.removeEventListener('wheel', handleWheel);
  }, []);

  // Estilo de Impressão Dinâmico
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: ${activeWidth}mm ${activeHeight}mm;
          margin: 0;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #app-sidebar, #app-header, #mobile-nav {
          display: none !important;
        }
        #print-area {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: none !important;
        }
        .canvas-container {
          width: ${activeWidth}mm !important;
          height: ${activeHeight}mm !important;
          max-width: none !important;
          max-height: none !important;
          box-shadow: none !important;
          border: none !important;
          transform: none !important;
          margin: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [activeWidth, activeHeight]);

  // Teclado (Nudge)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['input', 'textarea'].includes(e.target.tagName.toLowerCase())) return;
      if (selectedIds.length === 0) return;

      let dx = 0;
      let dy = 0;
      const step = e.shiftKey ? 1 : 0.1;

      switch (e.key) {
        case 'ArrowUp': dy = -step; break;
        case 'ArrowDown': dy = step; break;
        case 'ArrowLeft': dx = -step; break;
        case 'ArrowRight': dx = step; break;
        default: return;
      }

      e.preventDefault();

      setElements(prevElements => prevElements.map(el => {
        if (selectedIds.includes(el.id)) {
          return {
            ...el,
            x: Math.max(0, Math.min(100, el.x + dx)),
            y: Math.max(0, Math.min(100, el.y + dy))
          };
        }
        return el;
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds]);

  // Upload Imagem de Fundo
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBgImage(event.target.result);
        setActiveMobileView('canvas'); 
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => setBgImage(null);

  // Inserir Imagem Solta via Botão
  const handleAddImageElement = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newElement = {
          id: Date.now().toString(),
          type: 'image',
          src: event.target.result,
          name: file.name, // <-- Extrai o nome do arquivo
          x: 50,
          y: 50,
          width: 30,
          opacity: 100,
          rotation: 0,
          scaleX: 1,
          scaleY: 1
        };
        setElements(prev => [...prev, newElement]);
        setSelectedIds([newElement.id]);
        setActiveMobileView('canvas'); 
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Gerar QR Code
  const handleAddQRCode = () => {
    if (!qrInput.trim()) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrInput.trim())}`;
    
    const newElement = {
      id: Date.now().toString(),
      type: 'image',
      src: qrUrl,
      name: 'QR Code Gerado', // <-- Define um nome amigável para a camada
      x: 50,
      y: 50,
      width: 20, 
      opacity: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    };
    
    setElements(prev => [...prev, newElement]);
    setSelectedIds([newElement.id]);
    setQrInput(''); 
    setActiveMobileView('canvas'); 
  };

  // Importar Fonte
  const handleImportGoogleFont = () => {
    if (!googleFontInput.trim()) return;
    const fontName = googleFontInput.trim();
    const formattedName = fontName.replace(/\s+/g, '+');
    
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@400;700;900&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const newFontObj = { label: fontName, value: `"${fontName}", sans-serif` };
    setCustomFonts(prev => [...prev, newFontObj]);
    setGoogleFontInput('');

    if (selectedIds.length > 0) {
      updateSelectedElements({ fontFamily: newFontObj.value });
    }
  };

  // Adicionar Texto
  const addText = () => {
    const newElement = {
      id: Date.now().toString(),
      type: 'text',
      content: 'Novo Texto',
      x: 50,
      y: 50,
      fontSize: 24, 
      color: '#000000',
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif',
      opacity: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    };
    setElements([...elements, newElement]);
    setSelectedIds([newElement.id]);
    setActiveMobileView('canvas'); 
  };

  const updateSelectedElements = (updates) => {
    setElements(elements.map(el => selectedIds.includes(el.id) ? { ...el, ...updates } : el));
  };

  const deleteSelectedElements = () => {
    setElements(elements.filter(el => !selectedIds.includes(el.id)));
    setSelectedIds([]);
  };

  const handleGroupElements = () => {
    const groupId = Date.now().toString();
    updateSelectedElements({ groupId });
  };

  const handleUngroupElements = () => {
    updateSelectedElements({ groupId: undefined });
  };

  // Drag and Drop Logic (Canvas)
  const handleMouseDown = (e, id) => {
    if (['input', 'textarea'].includes(e.target.tagName.toLowerCase())) return; 
    
    const element = elements.find(el => el.id === id);
    if (!element || !paperRef.current) return;

    let targetIds = [id];
    if (element.groupId) {
      targetIds = elements.filter(el => el.groupId === element.groupId).map(el => el.id);
    }

    let newSelectedIds = [...selectedIds];
    if (e.shiftKey) {
      const allSelected = targetIds.every(tid => selectedIds.includes(tid));
      if (allSelected) {
        newSelectedIds = selectedIds.filter(sid => !targetIds.includes(sid));
      } else {
        newSelectedIds = [...new Set([...selectedIds, ...targetIds])];
      }
    } else {
      if (!targetIds.every(tid => selectedIds.includes(tid))) {
        newSelectedIds = targetIds;
      }
    }
    
    setSelectedIds(newSelectedIds);

    const paperRect = paperRef.current.getBoundingClientRect();
    const allNodes = Array.from(document.querySelectorAll('.element-node'));
    
    const selectedNodes = allNodes.filter(node => newSelectedIds.includes(node.dataset.id));
    const siblingNodes = allNodes.filter(node => !newSelectedIds.includes(node.dataset.id));

    let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
    selectedNodes.forEach(node => {
      const rect = node.getBoundingClientRect();
      minLeft = Math.min(minLeft, rect.left);
      minTop = Math.min(minTop, rect.top);
      maxRight = Math.max(maxRight, rect.right);
      maxBottom = Math.max(maxBottom, rect.bottom);
    });

    const groupBounds = {
      left: ((minLeft - paperRect.left) / paperRect.width) * 100,
      top: ((minTop - paperRect.top) / paperRect.height) * 100,
      right: ((maxRight - paperRect.left) / paperRect.width) * 100,
      bottom: ((maxBottom - paperRect.top) / paperRect.height) * 100,
    };
    groupBounds.centerX = (groupBounds.left + groupBounds.right) / 2;
    groupBounds.centerY = (groupBounds.top + groupBounds.bottom) / 2;
    groupBounds.widthPct = groupBounds.right - groupBounds.left;
    groupBounds.heightPct = groupBounds.bottom - groupBounds.top;

    const siblingBounds = siblingNodes.map(node => {
      const rect = node.getBoundingClientRect();
      return {
        id: node.dataset.id,
        top: ((rect.top - paperRect.top) / paperRect.height) * 100,
        bottom: ((rect.bottom - paperRect.top) / paperRect.height) * 100,
        left: ((rect.left - paperRect.left) / paperRect.width) * 100,
        right: ((rect.right - paperRect.left) / paperRect.width) * 100,
        centerY: ((rect.top + rect.height / 2 - paperRect.top) / paperRect.height) * 100,
        centerX: ((rect.left + rect.width / 2 - paperRect.left) / paperRect.width) * 100
      };
    });

    const initialPositions = elements
      .filter(el => newSelectedIds.includes(el.id))
      .map(el => ({ id: el.id, x: el.x, y: el.y }));

    dragItem.current = {
      ids: newSelectedIds,
      startX: e.clientX,
      startY: e.clientY,
      initialPositions,
      groupBounds,
      paperWidth: paperRect.width,
      paperHeight: paperRect.height,
      siblingBounds
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!dragItem.current) return;

    const { ids, startX, startY, initialPositions, groupBounds, paperWidth, paperHeight, siblingBounds } = dragItem.current;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const dxPercent = (dx / paperWidth) * 100;
    const dyPercent = (dy / paperHeight) * 100;

    let newGroupCenterX = groupBounds.centerX + dxPercent;
    let newGroupCenterY = groupBounds.centerY + dyPercent;

    let snapCenterX = false, snapCenterY = false;
    let snapElementX = null, snapElementY = null;
    let snapEdgeX = null, snapEdgeY = null;
    const SNAP_THRESHOLD = 2; 

    let minDx = SNAP_THRESHOLD;
    let targetX = newGroupCenterX;
    let draggedLeft = newGroupCenterX - (groupBounds.widthPct / 2);
    let draggedRight = newGroupCenterX + (groupBounds.widthPct / 2);

    if (Math.abs(newGroupCenterX - 50) < minDx) {
      minDx = Math.abs(newGroupCenterX - 50);
      targetX = 50;
      snapCenterX = true;
    }

    siblingBounds.forEach(sib => {
      if (Math.abs(newGroupCenterX - sib.centerX) < minDx) {
        minDx = Math.abs(newGroupCenterX - sib.centerX);
        targetX = sib.centerX;
        snapCenterX = false; snapElementX = sib.centerX; snapEdgeX = null;
      }
      if (Math.abs(draggedLeft - sib.left) < minDx) {
        minDx = Math.abs(draggedLeft - sib.left);
        targetX = sib.left + (groupBounds.widthPct / 2);
        snapCenterX = false; snapElementX = null; snapEdgeX = sib.left;
      }
      if (Math.abs(draggedRight - sib.right) < minDx) {
        minDx = Math.abs(draggedRight - sib.right);
        targetX = sib.right - (groupBounds.widthPct / 2);
        snapCenterX = false; snapElementX = null; snapEdgeX = sib.right;
      }
      if (Math.abs(draggedLeft - sib.right) < minDx) {
        minDx = Math.abs(draggedLeft - sib.right);
        targetX = sib.right + (groupBounds.widthPct / 2);
        snapCenterX = false; snapElementX = null; snapEdgeX = sib.right;
      }
      if (Math.abs(draggedRight - sib.left) < minDx) {
        minDx = Math.abs(draggedRight - sib.left);
        targetX = sib.left - (groupBounds.widthPct / 2);
        snapCenterX = false; snapElementX = null; snapEdgeX = sib.left;
      }
    });

    const finalDeltaX = targetX - groupBounds.centerX;

    let minDy = SNAP_THRESHOLD;
    let targetY = newGroupCenterY;
    let draggedTop = newGroupCenterY - (groupBounds.heightPct / 2);
    let draggedBottom = newGroupCenterY + (groupBounds.heightPct / 2);

    if (Math.abs(newGroupCenterY - 50) < minDy) {
      minDy = Math.abs(newGroupCenterY - 50);
      targetY = 50;
      snapCenterY = true;
    }

    siblingBounds.forEach(sib => {
      if (Math.abs(newGroupCenterY - sib.centerY) < minDy) {
        minDy = Math.abs(newGroupCenterY - sib.centerY);
        targetY = sib.centerY;
        snapCenterY = false; snapElementY = sib.centerY; snapEdgeY = null;
      }
      if (Math.abs(draggedTop - sib.top) < minDy) {
        minDy = Math.abs(draggedTop - sib.top);
        targetY = sib.top + (groupBounds.heightPct / 2);
        snapCenterY = false; snapElementY = null; snapEdgeY = sib.top;
      }
      if (Math.abs(draggedBottom - sib.bottom) < minDy) {
        minDy = Math.abs(draggedBottom - sib.bottom);
        targetY = sib.bottom - (groupBounds.heightPct / 2);
        snapCenterY = false; snapElementY = null; snapEdgeY = sib.bottom;
      }
      if (Math.abs(draggedTop - sib.bottom) < minDy) {
        minDy = Math.abs(draggedTop - sib.bottom);
        targetY = sib.bottom + (groupBounds.heightPct / 2);
        snapCenterY = false; snapElementY = null; snapEdgeY = sib.bottom;
      }
      if (Math.abs(draggedBottom - sib.top) < minDy) {
        minDy = Math.abs(draggedBottom - sib.top);
        targetY = sib.top - (groupBounds.heightPct / 2);
        snapCenterY = false; snapElementY = null; snapEdgeY = sib.top;
      }
    });

    const finalDeltaY = targetY - groupBounds.centerY;

    setGuides({ 
      centerX: snapCenterX, centerY: snapCenterY, 
      elementX: snapElementX, elementY: snapElementY,
      edgeX: snapEdgeX, edgeY: snapEdgeY
    });

    setElements(prev => prev.map(el => {
      if (ids.includes(el.id)) {
        const initialPos = initialPositions.find(p => p.id === el.id);
        let newX = initialPos.x + finalDeltaX;
        let newY = initialPos.y + finalDeltaY;
        
        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));

        return { ...el, x: newX, y: newY };
      }
      return el;
    }));
  };

  const handleMouseUp = () => {
    dragItem.current = null;
    setGuides({ centerX: false, centerY: false, elementX: null, elementY: null, edgeX: null, edgeY: null });
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // ==== LÓGICA DE ROTAÇÃO NO CANVAS ====
  const handleRotateMouseDown = (e, id) => {
    e.stopPropagation(); 
    
    const element = elements.find(el => el.id === id);
    if (!element) return;

    const elementNode = document.querySelector(`[data-id="${id}"]`);
    if (!elementNode) return;
    
    const rect = elementNode.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    rotateItem.current = {
      id,
      centerX,
      centerY,
      startAngle: element.rotation || 0,
    };

    document.addEventListener('mousemove', handleRotateMouseMove);
    document.addEventListener('mouseup', handleRotateMouseUp);
  };

  const handleRotateMouseMove = (e) => {
    if (!rotateItem.current) return;
    const { id, centerX, centerY } = rotateItem.current;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = angle - 90; 
    if (angle < 0) angle += 360;
    
    if (e.shiftKey) {
      angle = Math.round(angle / 45) * 45;
    } else {
      angle = Math.round(angle);
    }

    setElements(prev => prev.map(el => el.id === id ? { ...el, rotation: angle } : el));
  };

  const handleRotateMouseUp = () => {
    rotateItem.current = null;
    document.removeEventListener('mousemove', handleRotateMouseMove);
    document.removeEventListener('mouseup', handleRotateMouseUp);
  };

  const handlePrint = () => {
    setSelectedIds([]);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const selectedElementsList = elements.filter(el => selectedIds.includes(el.id));
  const selectedElement = selectedIds.length === 1 ? selectedElementsList[0] : null;
  const isMultiSelect = selectedIds.length > 1;
  const isGrouped = isMultiSelect && selectedElementsList.every(el => el.groupId && el.groupId === selectedElementsList[0].groupId);

  const allFonts = [...DEFAULT_FONTS, ...customFonts];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans text-gray-800">
      
      {/* Modal Personalizado de Confirmação Novo Projeto */}
      {showNewConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full m-4 transform scale-100">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Criar Novo Projeto?</h3>
              <p className="text-sm text-gray-600">
                Você possui alterações na prancheta. Deseja salvar o seu design atual antes de iniciar uma nova folha em branco?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSaveAndNew} 
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm transition"
              >
                Salvar Projeto e Continuar
              </button>
              <button 
                onClick={handleDiscardAndNew} 
                className="w-full py-2.5 px-4 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-semibold transition"
              >
                Descartar Tudo
              </button>
              <button 
                onClick={() => setShowNewConfirm(false)} 
                className="w-full py-2 px-4 bg-transparent text-gray-500 rounded-lg hover:bg-gray-100 text-sm font-medium transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar / Controles */}
      <aside 
        id="app-sidebar" 
        className={`w-full md:w-80 shrink-0 bg-white border-r border-gray-200 p-6 flex flex-col shadow-lg z-10 overflow-y-auto h-screen relative pb-24 md:pb-6 ${activeMobileView === 'controls' ? 'flex' : 'hidden md:flex'}`}
      >
        <div className="flex items-center gap-2 mb-6 text-blue-600">
          <Palette className="w-8 h-8" />
          <h1 className="text-2xl font-bold">EditorExpert</h1>
        </div>

        {/* PROJETOS: Novo, Salvar e Carregar */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Projeto
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleNewProject}
              className="py-2 px-2 bg-emerald-50 text-emerald-700 rounded-md font-medium border border-emerald-200 hover:bg-emerald-100 flex flex-col items-center justify-center gap-1 transition text-xs"
              title="Iniciar uma prancheta em branco"
            >
              <FileText className="w-4 h-4" /> Novo
            </button>
            <button
              onClick={handleSaveProject}
              className="py-2 px-2 bg-indigo-50 text-indigo-700 rounded-md font-medium border border-indigo-200 hover:bg-indigo-100 flex flex-col items-center justify-center gap-1 transition text-xs"
              title="Baixar projeto atual para o computador"
            >
              <Save className="w-4 h-4" /> Salvar
            </button>
            <label className="py-2 px-2 bg-white text-gray-700 rounded-md font-medium border border-gray-300 hover:bg-gray-50 flex flex-col items-center justify-center gap-1 transition text-xs cursor-pointer" title="Abrir um arquivo .expert">
              <Upload className="w-4 h-4" /> Abrir
              <input type="file" accept=".expert,.json" className="hidden" onChange={handleLoadProject} />
            </label>
          </div>
        </section>

        {/* Configurações da Folha */}
        <section className="mb-6 border-t border-gray-200 pt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Formato da Folha
          </h2>
          
          <div className="grid grid-cols-4 gap-2 mb-3">
            {Object.keys(PAPER_SIZES).map(size => (
              <button
                key={size}
                onClick={() => { setPaperSize(size); setZoom(1); }}
                className={`py-2 rounded text-sm font-medium border transition-colors flex flex-col items-center justify-center ${
                  paperSize === size ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                {size}
                <span className="text-[10px] text-gray-400 mt-1 font-normal">
                  {PAPER_SIZES[size].width}x{PAPER_SIZES[size].height}
                </span>
              </button>
            ))}
            <button
              onClick={() => { setPaperSize('Custom'); setZoom(2.5); }} 
              className={`py-2 rounded text-sm font-medium border transition-colors flex flex-col items-center justify-center ${
                paperSize === 'Custom' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              Pers.
              <span className="text-[10px] text-gray-400 mt-1 font-normal">Livre</span>
            </button>
          </div>

          {paperSize === 'Custom' && (
            <div className="flex gap-2 mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex-1">
                <label className="text-xs font-semibold text-blue-700 block mb-1">Largura (mm)</label>
                <input 
                  type="number" min="10" 
                  value={customPaper.width} 
                  onChange={(e) => setCustomPaper({...customPaper, width: parseInt(e.target.value) || 10})}
                  className="w-full text-sm p-1.5 border border-blue-200 rounded outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-blue-700 block mb-1">Altura (mm)</label>
                <input 
                  type="number" min="10" 
                  value={customPaper.height} 
                  onChange={(e) => setCustomPaper({...customPaper, height: parseInt(e.target.value) || 10})}
                  className="w-full text-sm p-1.5 border border-blue-200 rounded outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setOrientation('portrait')}
              className={`flex-1 py-1.5 text-sm rounded ${orientation === 'portrait' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Retrato
            </button>
            <button
              onClick={() => setOrientation('landscape')}
              className={`flex-1 py-1.5 text-sm rounded ${orientation === 'landscape' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Paisagem
            </button>
          </div>
        </section>

        {/* Configurações de Fundo */}
        <section className="mb-6 border-t border-gray-200 pt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Fundo da Placa</h2>
          
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Cor Sólida</label>
            <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={bgColor} 
                onChange={(e) => setBgColor(e.target.value)}
                className="w-full h-8 cursor-pointer rounded border border-gray-300 p-0"
              />
              <span className="text-xs font-mono uppercase text-gray-500 w-16 text-right">{bgColor}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Imagem de Fundo</label>
            {bgImage ? (
              <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="h-24 bg-gray-200 rounded border border-gray-300 overflow-hidden relative">
                  <img src={bgImage} alt="bg" className="w-full h-full object-cover" style={{ opacity: bgImageOpacity / 100 }} />
                  <button onClick={removeImage} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600 shadow">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                
                <select 
                  value={bgImageMode} 
                  onChange={(e) => setBgImageMode(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded p-1.5 outline-none"
                >
                  <option value="cover">Preencher Folha (Cover)</option>
                  <option value="contain">Caber na Folha (Contain)</option>
                  <option value="100% 100%">Esticar (Fill)</option>
                </select>

                <div>
                  <label className="text-xs font-semibold text-gray-600 flex justify-between mb-1">
                    <span>Transparência (Marca D&apos;água)</span>
                    <span>{bgImageOpacity}%</span>
                  </label>
                  <input 
                    type="range" min="5" max="100" step="1" 
                    value={bgImageOpacity} 
                    onChange={(e) => setBgImageOpacity(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ImageIcon className="w-5 h-5 text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500 font-medium">Clique para importar</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            )}
          </div>
        </section>

        {/* Ferramentas de Inserção */}
        <section className="mb-6 border-t border-gray-200 pt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Adicionar</h2>
          <div className="flex gap-2 mb-3">
            <button 
              onClick={addText}
              className="flex-1 py-2 px-4 bg-gray-800 text-white rounded-md hover:bg-gray-900 flex items-center justify-center gap-2 transition text-sm"
            >
              <Type className="w-4 h-4" /> Texto
            </button>
            <label className="flex-1 py-2 px-4 bg-gray-800 text-white rounded-md hover:bg-gray-900 flex items-center justify-center gap-2 transition text-sm cursor-pointer">
              <ImagePlus className="w-4 h-4" /> Imagem
              <input type="file" className="hidden" accept="image/*" onChange={handleAddImageElement} />
            </label>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
             <label className="block text-xs font-semibold text-gray-600 mb-2">Gerar QR Code (Link ou Texto)</label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="ex: www.seusite.com.br"
                 value={qrInput}
                 onChange={(e) => setQrInput(e.target.value)}
                 className="flex-1 min-w-0 text-sm p-1.5 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-gray-400"
               />
               <button 
                 onClick={handleAddQRCode}
                 className="shrink-0 whitespace-nowrap bg-gray-800 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-900 flex items-center gap-1"
               >
                 <QrCode className="w-4 h-4" /> Add
               </button>
             </div>
          </div>
        </section>

        {/* Importar Google Fonts */}
        <section className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <label className="block text-xs font-semibold text-gray-600 mb-2">Importar Google Font</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Ex: Roboto, Oswald"
              value={googleFontInput}
              onChange={(e) => setGoogleFontInput(e.target.value)}
              className="flex-1 min-w-0 text-sm p-1.5 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button 
              onClick={handleImportGoogleFont}
              className="shrink-0 whitespace-nowrap bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </section>

        {/* Painel de Camadas (Z-Index Manager) COM NÚMEROS E NOMES */}
        {elements.length > 0 && (
          <section className="mb-6 border-t border-gray-200 pt-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Camadas
            </h2>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
              {/* O array original é renderizado de baixo para cima, então revertemos visualmente para o item do topo ficar em 1º na lista */}
              {[...elements].reverse().map((el, reversedIndex) => {
                const actualIndex = elements.length - 1 - reversedIndex;
                const isSelected = selectedIds.includes(el.id);
                const layerNumber = actualIndex + 1; // O número da camada visual
                
                return (
                  <div 
                    key={el.id} 
                    className={`flex items-center justify-between p-2 rounded border cursor-pointer transition ${
                      isSelected ? 'bg-blue-100 border-blue-300 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => { setSelectedIds([el.id]); setActiveMobileView('canvas'); }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1" title={el.name || el.content}>
                       {/* Etiqueta Numérica da Camada */}
                       <span className="bg-gray-200 text-gray-700 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm shrink-0">
                         {layerNumber}
                       </span>
                       
                       {el.type === 'text' ? <Type className="w-3.5 h-3.5 text-gray-500 shrink-0"/> : <ImageIcon className="w-3.5 h-3.5 text-gray-500 shrink-0"/>}
                       
                       {/* Nome da camada dinâmico (com o nome do arquivo se existir) */}
                       <span className="truncate whitespace-nowrap text-gray-700 font-medium text-xs">
                         {el.type === 'text' ? (el.content || 'Texto Vazio') : (el.name || 'Imagem')}
                       </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                       {/* Botão de Subir Camada (no array significa ir para o final) */}
                       <button 
                         onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 'up'); }} 
                         disabled={actualIndex === elements.length - 1} 
                         className="p-1 hover:bg-white bg-gray-100 border border-gray-200 rounded disabled:opacity-30 transition"
                         title="Trazer para frente"
                       >
                         <ChevronUp className="w-3 h-3" />
                       </button>
                       {/* Botão de Descer Camada (no array significa ir para o começo) */}
                       <button 
                         onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 'down'); }} 
                         disabled={actualIndex === 0} 
                         className="p-1 hover:bg-white bg-gray-100 border border-gray-200 rounded disabled:opacity-30 transition"
                         title="Enviar para trás"
                       >
                         <ChevronDown className="w-3 h-3" />
                       </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Editor de Multi-Seleção / Grupos */}
        {isMultiSelect && (
          <section className="bg-fuchsia-50 p-4 rounded-xl border border-fuchsia-200 mb-4 shrink-0 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-fuchsia-800 flex items-center gap-1">
                <Settings2 className="w-4 h-4"/> 
                Múltiplos Selecionados
              </h2>
              <button onClick={deleteSelectedElements} className="text-red-500 hover:text-red-700" title="Excluir Seleção">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                {!isGrouped ? (
                  <button 
                    onClick={handleGroupElements}
                    className="flex-1 py-2 bg-fuchsia-600 text-white text-sm font-medium rounded hover:bg-fuchsia-700 flex items-center justify-center gap-2"
                  >
                    <Link className="w-4 h-4"/> Agrupar
                  </button>
                ) : (
                  <button 
                    onClick={handleUngroupElements}
                    className="flex-1 py-2 bg-white border border-fuchsia-300 text-fuchsia-700 text-sm font-medium rounded hover:bg-fuchsia-50 flex items-center justify-center gap-2"
                  >
                    <Unlink className="w-4 h-4"/> Desagrupar
                  </button>
                )}
              </div>
              
              <div className="pt-2 border-t border-fuchsia-100">
                <label className="text-xs font-semibold text-fuchsia-800 flex justify-between mb-1">
                  <span>Opacidade em Massa</span>
                </label>
                <input 
                  type="range" min="5" max="100" step="1" 
                  defaultValue={100}
                  onChange={(e) => updateSelectedElements({ opacity: parseInt(e.target.value) })}
                  className="w-full accent-fuchsia-600"
                />
              </div>
            </div>
          </section>
        )}

        {/* Editor de Elemento Único */}
        {selectedElement && !isMultiSelect && (
          <section className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-4 shrink-0 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-blue-800 flex items-center gap-1">
                <Settings2 className="w-4 h-4"/> 
                {selectedElement.type === 'text' ? 'Editar Texto' : 'Editar Imagem'}
              </h2>
              <button onClick={deleteSelectedElements} className="text-red-500 hover:text-red-700" title="Excluir Elemento">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              
              {/* Controles Específicos: Texto */}
              {selectedElement.type === 'text' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-blue-700 block mb-1">Conteúdo do Texto</label>
                    <textarea 
                      value={selectedElement.content}
                      onChange={(e) => updateSelectedElements({ content: e.target.value })}
                      className="w-full text-sm p-2 border border-blue-200 rounded resize-none focus:ring-2 focus:ring-blue-400 outline-none"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-blue-700 block mb-1">Estilo de Fonte</label>
                    <select 
                      value={selectedElement.fontFamily} 
                      onChange={(e) => updateSelectedElements({ fontFamily: e.target.value })}
                      className="w-full text-sm p-2 border border-blue-200 rounded outline-none"
                    >
                      {allFonts.map((font, idx) => (
                        <option key={idx} value={font.value} style={{ fontFamily: font.value }}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-blue-700 block mb-1">Tamanho (pt)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" min="8" max="500" 
                          value={selectedElement.fontSize} 
                          onChange={(e) => updateSelectedElements({ fontSize: parseInt(e.target.value) || 12 })}
                          className="w-full text-sm p-1.5 border border-blue-200 rounded outline-none text-center font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-blue-700 block mb-1">Peso</label>
                      <select 
                        value={selectedElement.fontWeight} 
                        onChange={(e) => updateSelectedElements({ fontWeight: e.target.value })}
                        className="w-full text-sm p-1.5 border border-blue-200 rounded outline-none"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Negrito</option>
                        <option value="900">Black</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-blue-700 block mb-1">Cor</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={selectedElement.color} 
                        onChange={(e) => updateSelectedElements({ color: e.target.value })}
                        className="w-full h-8 cursor-pointer rounded border border-blue-200 p-0"
                      />
                      <span className="text-xs font-mono uppercase text-gray-600">{selectedElement.color}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Controles Específicos: Imagem */}
              {selectedElement.type === 'image' && (
                <div>
                  <label className="text-xs font-semibold text-blue-700 flex justify-between mb-1">
                    <span>Tamanho da Imagem</span>
                    <span>{selectedElement.width}%</span>
                  </label>
                  <input 
                    type="range" min="5" max="150" step="1" 
                    value={selectedElement.width} 
                    onChange={(e) => updateSelectedElements({ width: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              {/* Controles de Transformação (Rotação e Espelhamento) */}
              <div className="pt-3 border-t border-blue-100">
                <label className="text-xs font-semibold text-blue-700 block mb-2">Transformação</label>
                <div className="flex items-center gap-3 mb-3">
                  <RotateCw className="w-4 h-4 text-blue-500" />
                  <input 
                    type="range" min="0" max="360" step="1" 
                    value={selectedElement.rotation || 0} 
                    onChange={(e) => updateSelectedElements({ rotation: parseInt(e.target.value) })}
                    className="flex-1 accent-blue-600"
                  />
                  <input 
                    type="number" min="0" max="360" 
                    value={selectedElement.rotation || 0} 
                    onChange={(e) => updateSelectedElements({ rotation: parseInt(e.target.value) })}
                    className="w-14 text-xs p-1 border border-blue-200 rounded outline-none text-center font-mono"
                  />
                  <span className="text-xs font-bold text-blue-600">°</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => updateSelectedElements({ scaleX: (selectedElement.scaleX || 1) === 1 ? -1 : 1 })}
                    className={`flex-1 py-1.5 border rounded flex items-center justify-center gap-2 text-xs transition ${selectedElement.scaleX === -1 ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'}`}
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" /> Inverter H.
                  </button>
                  <button 
                    onClick={() => updateSelectedElements({ scaleY: (selectedElement.scaleY || 1) === 1 ? -1 : 1 })}
                    className={`flex-1 py-1.5 border rounded flex items-center justify-center gap-2 text-xs transition ${selectedElement.scaleY === -1 ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'}`}
                  >
                    <FlipVertical className="w-3.5 h-3.5" /> Inverter V.
                  </button>
                </div>
              </div>

              {/* Controle Comum: Opacidade */}
              <div className="pt-3 border-t border-blue-100">
                <label className="text-xs font-semibold text-blue-700 flex justify-between mb-1">
                  <span>Opacidade (Transparência)</span>
                  <span>{selectedElement.opacity !== undefined ? selectedElement.opacity : 100}%</span>
                </label>
                <input 
                  type="range" min="5" max="100" step="1" 
                  value={selectedElement.opacity !== undefined ? selectedElement.opacity : 100} 
                  onChange={(e) => updateSelectedElements({ opacity: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </section>
        )}

        {/* Rodapé Dinâmico e Elegante */}
        <div className="mt-auto pt-6 pb-2 shrink-0 flex items-center justify-center border-t border-gray-100">
          <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">
            @by expertsolutionsti
          </span>
        </div>
      </aside>

      {/* Área Principal / Visualização */}
      <main 
        className={`flex-1 flex flex-col h-screen overflow-hidden bg-gray-200 relative pb-16 md:pb-0 ${activeMobileView === 'canvas' ? 'flex' : 'hidden md:flex'}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Overlay Animado para Drag and Drop de Arquivos */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-[200] bg-blue-500/20 backdrop-blur-sm border-8 border-blue-500 border-dashed m-4 rounded-3xl flex flex-col items-center justify-center pointer-events-none transition-all">
            <ImagePlus className="w-24 h-24 text-blue-600 mb-6 animate-bounce drop-shadow-md" />
            <h2 className="text-4xl font-extrabold text-blue-800 drop-shadow-sm mb-2">Solte a imagem aqui!</h2>
            <p className="text-lg text-blue-700 font-medium bg-white/50 px-6 py-2 rounded-full">
              Ela será adicionada automaticamente ao seu design.
            </p>
          </div>
        )}
        
        {/* Header / Ações da Prancheta */}
        <header id="app-header" className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-xs md:text-sm text-gray-500">
              Folha: <strong className="text-gray-800">{paperSize === 'Custom' ? 'Pers.' : paperSize}</strong> <span className="hidden md:inline">({activeWidth} x {activeHeight} mm)</span>
            </div>

            {/* Componente Gráfico de Controle do Zoom */}
            <div className="flex items-center gap-2 md:gap-3 border-l border-gray-300 pl-4 md:pl-6">
              <ZoomIn className="w-4 h-4 text-gray-400" />
              <input 
                type="range" min="0.2" max="10" step="0.1" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-16 md:w-24 accent-blue-600 cursor-pointer"
                title="Use o scroll do mouse para ajustar livremente"
              />
              <span className="text-[10px] md:text-xs font-bold text-blue-600 w-8">{Math.round(zoom * 100)}%</span>
            </div>
          </div>

          <button 
            onClick={handlePrint}
            className="py-1.5 px-3 md:py-2 md:px-6 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 flex items-center gap-2 shadow-md transition transform hover:-translate-y-0.5 text-xs md:text-sm"
          >
            <Printer className="w-4 h-4 md:w-5 md:h-5" /> <span className="hidden md:inline">Imprimir / Salvar</span>
          </button>
        </header>

        {/* Container da Prancheta (Canvas) */}
        <div 
          id="print-area" 
          ref={printAreaRef}
          className="flex-1 overflow-auto p-4 md:p-8 flex items-start justify-start"
          onClick={() => setSelectedIds([])}
        >
          {/* A Folha */}
          <div 
            ref={paperRef}
            className="canvas-container relative bg-white shadow-2xl transition-all duration-75 mx-auto my-auto"
            style={{
              aspectRatio: `${activeWidth} / ${activeHeight}`,
              backgroundColor: bgColor,
              height: `calc((100vh - 8rem) * ${zoom})`,
              maxHeight: `${activeHeight * zoom}mm`,
              overflow: 'hidden',
              contain: 'paint layout',
              containerType: 'inline-size' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Camada da Imagem de Fundo */}
            {bgImage && (
              <div 
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                style={{
                  backgroundImage: `url(${bgImage})`,
                  backgroundSize: bgImageMode === 'fill' ? '100% 100%' : bgImageMode,
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: bgImageOpacity / 100,
                }}
              />
            )}
            
            {/* Linhas Guias */}
            {guides.centerX && <div className="absolute top-0 bottom-0 left-1/2 w-0 border-l border-dashed border-blue-500 z-50 pointer-events-none" style={{ transform: 'translateX(-50%)' }} />}
            {guides.centerY && <div className="absolute left-0 right-0 top-1/2 h-0 border-t border-dashed border-blue-500 z-50 pointer-events-none" style={{ transform: 'translateY(-50%)' }} />}
            {guides.elementX !== null && <div className="absolute top-0 bottom-0 w-0 border-l border-dashed border-fuchsia-500 z-50 pointer-events-none" style={{ left: `${guides.elementX}%`, transform: 'translateX(-50%)' }} />}
            {guides.elementY !== null && <div className="absolute left-0 right-0 h-0 border-t border-dashed border-fuchsia-500 z-50 pointer-events-none" style={{ top: `${guides.elementY}%`, transform: 'translateY(-50%)' }} />}
            {guides.edgeX !== null && <div className="absolute top-0 bottom-0 w-0 border-l border-dashed border-emerald-500 z-50 pointer-events-none" style={{ left: `${guides.edgeX}%`, transform: 'translateX(-50%)' }} />}
            {guides.edgeY !== null && <div className="absolute left-0 right-0 h-0 border-t border-dashed border-emerald-500 z-50 pointer-events-none" style={{ top: `${guides.edgeY}%`, transform: 'translateY(-50%)' }} />}

            {/* Elementos na Folha */}
            {elements.map((el, index) => {
              const fontSizeMm = (el.fontSize || 72) * 0.352778;
              const fontSizeCqw = (fontSizeMm / activeWidth) * 100;
              const isSelected = selectedIds.includes(el.id);
              const flipStyle = { transform: `scale(${el.scaleX || 1}, ${el.scaleY || 1})` };

              return (
                <div
                  key={el.id}
                  data-id={el.id}
                  className={`element-node absolute group cursor-move ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-500/10' : 'hover:ring-1 hover:ring-transparent'
                  }`}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                    width: el.type === 'image' ? `${el.width}%` : 'max-content',
                    color: el.color,
                    fontSize: el.type === 'text' ? `${fontSizeCqw}cqw` : undefined, 
                    fontWeight: el.fontWeight,
                    fontFamily: el.fontFamily,
                    opacity: el.opacity !== undefined ? el.opacity / 100 : 1,
                    // ==== LÓGICA DE Z-INDEX INTELIGENTE ====
                    zIndex: isSelected ? elements.length + 100 : index,
                    padding: '2px',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                >
                  {/* Ícone de mover */}
                  {(isSelected && selectedIds.length === 1) && (
                    <div className="absolute -top-3 -right-3 bg-blue-600 text-white rounded-full p-1 shadow z-20">
                      <Move className="w-3 h-3" />
                    </div>
                  )}
                  
                  {/* Ícone (Handle) de rotação na prancheta */}
                  {(isSelected && selectedIds.length === 1) && (
                    <div 
                      className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white text-blue-600 rounded-full p-1.5 shadow-md z-20 cursor-grab border border-gray-200 hover:bg-blue-50"
                      onMouseDown={(e) => handleRotateMouseDown(e, el.id)}
                      title="Segure Shift para travar os ângulos"
                    >
                      <RotateCw className="w-3 h-3" />
                    </div>
                  )}

                  {/* Ícone de grupo pequeno se estiver agrupado */}
                  {el.groupId && !isSelected && (
                    <div className="absolute -bottom-2 -right-2 bg-fuchsia-100 text-fuchsia-600 rounded-full p-0.5 shadow-sm z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link className="w-2.5 h-2.5" />
                    </div>
                  )}
                  
                  {/* Conteúdo com suporte a espelhamento */}
                  <div style={flipStyle} className="w-full h-full">
                    {el.type === 'text' ? (
                      <span className="whitespace-pre-wrap text-center select-none block leading-tight pointer-events-none">
                        {el.content}
                      </span>
                    ) : el.type === 'image' ? (
                      <img 
                        src={el.src} 
                        alt="Elemento Visual" 
                        draggable="false" 
                        className="w-full h-auto pointer-events-none select-none block"
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ==== MENU INFERIOR MOBILE ==== */}
      <div id="mobile-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center p-2 z-[100] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <button
          onClick={() => setActiveMobileView('controls')}
          className={`flex flex-col items-center p-2 flex-1 rounded-lg transition-colors ${activeMobileView === 'controls' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Sliders className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Ferramentas</span>
        </button>
        <button
          onClick={() => setActiveMobileView('canvas')}
          className={`flex flex-col items-center p-2 flex-1 rounded-lg transition-colors ${activeMobileView === 'canvas' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Monitor className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Prancheta</span>
        </button>
      </div>

    </div>
  );
}

export default App;