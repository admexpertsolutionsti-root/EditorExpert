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
  ZoomIn
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

function PlacaEditor() {
  // Estados Gerais do Papel e Zoom
  const [paperSize, setPaperSize] = useState('A4');
  const [customPaper, setCustomPaper] = useState({ width: 110, height: 30 }); // Padrão etiqueta de gôndola
  const [orientation, setOrientation] = useState('landscape'); 
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgImage, setBgImage] = useState(null);
  const [bgImageMode, setBgImageMode] = useState('cover');
  const [bgImageOpacity, setBgImageOpacity] = useState(100);
  const [zoom, setZoom] = useState(1); // Nível inicial do zoom (1 = 100%)
  
  // Estados dos Elementos, Seleção e Fontes Customizadas
  const [elements, setElements] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [customFonts, setCustomFonts] = useState([]);
  const [googleFontInput, setGoogleFontInput] = useState('');
  const [qrInput, setQrInput] = useState(''); 
  
  // Estado para controlar a exibição das linhas guias
  const [guides, setGuides] = useState({ centerX: false, centerY: false, elementX: null, elementY: null, edgeX: null, edgeY: null });
  
  // Refs
  const dragItem = useRef(null);
  const paperRef = useRef(null);
  const printAreaRef = useRef(null);

  // Calcula largura e altura ativas em milímetros com base no tipo escolhido
  const getBaseDimensions = () => {
    if (paperSize === 'Custom') return customPaper;
    return PAPER_SIZES[paperSize];
  };

  const baseDims = getBaseDimensions();
  const activeWidth = orientation === 'portrait' ? baseDims.width : baseDims.height;
  const activeHeight = orientation === 'portrait' ? baseDims.height : baseDims.width;
  
  // Lógica Avançada de Zoom via Scroll (Wheel)
  useEffect(() => {
    const area = printAreaRef.current;
    if (!area) return;

    const handleWheel = (e) => {
      // Ignora o zoom se o usuário estiver rolando em algum menu, foca apenas se estiver fora (ctrl key ou livre)
      // Permite o shift para scroll horizontal nativo
      if (!e.shiftKey) {
        e.preventDefault();
        // Fator suave de aproximação (-0.002 garante transição perfeita e não violenta)
        const zoomChange = e.deltaY * -0.002;
        setZoom(z => Math.max(0.2, Math.min(z + zoomChange, 10))); // Permite zoom de 20% até 1000%
      }
    };

    // { passive: false } é obrigatório para podermos dar e.preventDefault() no scroll nativo do navegador
    area.addEventListener('wheel', handleWheel, { passive: false });
    return () => area.removeEventListener('wheel', handleWheel);
  }, []);

  // Estilo de impressão dinâmico - Bloqueia o Zoom no momento de ir pro papel!
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
        #app-sidebar, #app-header {
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
          /* No modo de impressão, usamos !important para anular o Zoom e devolver a folha para medidas reais exatas */
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

  // Evento Global de Teclado (Nudge com Setas)
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

  // Manipuladores de Imagem de Fundo
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setBgImage(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => setBgImage(null);

  // Inserir Imagem Solta
  const handleAddImageElement = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newElement = {
          id: Date.now().toString(),
          type: 'image',
          src: event.target.result,
          x: 50,
          y: 50,
          width: 30,
          opacity: 100
        };
        setElements(prev => [...prev, newElement]);
        setSelectedIds([newElement.id]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Gerar QR Code via API Externa
  const handleAddQRCode = () => {
    if (!qrInput.trim()) return;
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrInput.trim())}`;
    
    const newElement = {
      id: Date.now().toString(),
      type: 'image',
      src: qrUrl,
      x: 50,
      y: 50,
      width: 20, 
      opacity: 100
    };
    
    setElements(prev => [...prev, newElement]);
    setSelectedIds([newElement.id]);
    setQrInput(''); 
  };

  // Importar Google Font
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

  // Manipuladores de Texto e Elementos
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
      opacity: 100
    };
    setElements([...elements, newElement]);
    setSelectedIds([newElement.id]);
  };

  const updateSelectedElements = (updates) => {
    setElements(elements.map(el => selectedIds.includes(el.id) ? { ...el, ...updates } : el));
  };

  const deleteSelectedElements = () => {
    setElements(elements.filter(el => !selectedIds.includes(el.id)));
    setSelectedIds([]);
  };

  // Lógica de Agrupamento
  const handleGroupElements = () => {
    const groupId = Date.now().toString();
    updateSelectedElements({ groupId });
  };

  const handleUngroupElements = () => {
    updateSelectedElements({ groupId: undefined });
  };

  // Drag and Drop Logic com Suporte a Grupos e Multi-seleção
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

    // Eixo X
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

    // Eixo Y
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
      
      {/* Sidebar / Controles */}
      <aside id="app-sidebar" className="w-full md:w-80 shrink-0 bg-white border-r border-gray-200 p-6 flex flex-col shadow-lg z-10 overflow-y-auto h-screen relative">
        <div className="flex items-center gap-2 mb-6 text-blue-600">
          <Palette className="w-8 h-8" />
          <h1 className="text-2xl font-bold">EditorExpert</h1>
        </div>

        {/* Configurações da Folha */}
        <section className="mb-6">
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
              onClick={() => { setPaperSize('Custom'); setZoom(2.5); }} // Aplica zoom auto pra etiqueta personalizada
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

              {/* Controle Comum: Opacidade */}
              <div className="pt-2 border-t border-blue-100">
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
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-200">
        
        {/* Header / Ações da Prancheta */}
        <header id="app-header" className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-6">
            <div className="text-sm text-gray-500">
              Folha: <strong className="text-gray-800">{paperSize === 'Custom' ? 'Personalizado' : paperSize}</strong> ({activeWidth} x {activeHeight} mm)
            </div>

            {/* Componente Gráfico de Controle do Zoom */}
            <div className="flex items-center gap-3 border-l border-gray-300 pl-6">
              <ZoomIn className="w-4 h-4 text-gray-400" />
              <input 
                type="range" min="0.2" max="10" step="0.1" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-24 accent-blue-600"
                title="Use o scroll do mouse para ajustar livremente"
              />
              <span className="text-xs font-bold text-blue-600 w-10">{Math.round(zoom * 100)}%</span>
            </div>

            {isMultiSelect && <span className="px-2 py-0.5 bg-fuchsia-100 text-fuchsia-700 rounded text-xs font-bold shadow-sm">Shift Ativo (Múltiplos)</span>}
          </div>

          <button 
            onClick={handlePrint}
            className="py-2 px-6 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 flex items-center gap-2 shadow-md transition transform hover:-translate-y-0.5"
          >
            <Printer className="w-5 h-5" /> Imprimir / Salvar
          </button>
        </header>

        {/* Container da Prancheta (Canvas) com Captura de Scroll Inteligente */}
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
              // O grande truque de arquitetura: escalonamos fisicamente na visualização para ativar o scroll natural
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
            {elements.map((el) => {
              const fontSizeMm = (el.fontSize || 72) * 0.352778;
              const fontSizeCqw = (fontSizeMm / activeWidth) * 100;
              const isSelected = selectedIds.includes(el.id);

              return (
                <div
                  key={el.id}
                  data-id={el.id}
                  className={`element-node absolute group cursor-move transform -translate-x-1/2 -translate-y-1/2 ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-500/10' : 'hover:ring-1 hover:ring-transparent'
                  }`}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: el.type === 'image' ? `${el.width}%` : 'max-content',
                    color: el.color,
                    fontSize: el.type === 'text' ? `${fontSizeCqw}cqw` : undefined, 
                    fontWeight: el.fontWeight,
                    fontFamily: el.fontFamily,
                    opacity: el.opacity !== undefined ? el.opacity / 100 : 1,
                    zIndex: isSelected ? 20 : 10,
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
                  {/* Ícone de grupo pequeno se estiver agrupado */}
                  {el.groupId && !isSelected && (
                    <div className="absolute -bottom-2 -right-2 bg-fuchsia-100 text-fuchsia-600 rounded-full p-0.5 shadow-sm z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link className="w-2.5 h-2.5" />
                    </div>
                  )}
                  
                  {el.type === 'text' ? (
                    <span 
                      className="whitespace-pre-wrap text-center select-none block leading-tight pointer-events-none"
                    >
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
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <div className="w-full h-screen">
      <PlacaEditor />
    </div>
  );
}