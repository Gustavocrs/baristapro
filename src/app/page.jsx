/**
 * @file page.jsx
 * @description Interface de calibração. Implementa arquitetura de estado isolado por 
 * método de extração (Expresso/V60) e seleção de acessórios via checkboxes. 
 * Contém parser de retrocompatibilidade para dados legados.
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Dicionário de acessórios para renderização dos checkboxes
const ACCESSORY_LIST = {
  espresso: [
    { id: "wdt", label: "WDT (Agulhas)" },
    { id: "tamper", label: "Tamper" },
    { id: "tamper_mola", label: "Tamper com Mola" },
    { id: "distribuidor", label: "Distribuidor" },
    { id: "puck_screen", label: "Puck Screen" },
    { id: "funil", label: "Funil Magnético" }
  ],
  filtro: [
    { id: "chaleira_ganso", label: "Chaleira Bico de Ganso" },
    { id: "filtro_papel", label: "Filtro de Papel" },
    { id: "filtro_inox", label: "Filtro de Inox" },
    { id: "melitta", label: "Suporte Melitta" },
    { id: "v60", label: "Suporte V60" }
  ],
  geral: [
    { id: "balanca", label: "Balança de Precisão" },
    { id: "rdt", label: "Borrifador (RDT)" },
    { id: "termometro", label: "Termômetro" }
  ]
};

const HomePage = () => {
  const [diagnosis, setDiagnosis] = useState(null);
  const [initialSettings, setInitialSettings] = useState(null);
  const [aiDiagnosis, setAiDiagnosis] = useState(null);
  const [firebaseError, setFirebaseError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isExtractionOpen, setIsExtractionOpen] = useState(true);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(true);

  // Arquitetura de estado aninhada
  const [inputs, setInputs] = useState({
    method: "espresso",
    machine: "",
    grinder: "",
    accessories: [],
    espresso: {
      dose: "", cupYield: "", clicks: "", roast: "medium", extractionTime: "", crema: "ideal", taste: "2"
    },
    v60: {
      dose: "", cupYield: "", clicks: "", roast: "medium", extractionTime: "", taste: "2"
    }
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isCameraModalOpen, setCameraModalOpen] = useState(false);

  const imagePreviewRef = useRef(null);
  const cameraFeedRef = useRef(null);
  const photoCanvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const inputsRef = useRef(inputs);
  const firebaseUnavailableRef = useRef(false);

  useEffect(() => {
    inputsRef.current = inputs;
  }, [inputs]);

  /**
   * Converte payloads legados (estado achatado) para o novo padrão isolado.
   * Evita erros de undefined ao carregar de localStorage/Firestore velhos.
   */
  const migrateLegacyData = (data) => {
    let migrated = { ...data };
    
    // Migração de acessórios (String para Array)
    if (typeof migrated.accessories === "string") {
      migrated.accessories = migrated.accessories.split(",").map(a => a.trim()).filter(Boolean);
    } else if (!Array.isArray(migrated.accessories)) {
      migrated.accessories = [];
    }

    // Migração de estado de extração (Raiz para Sub-objeto)
    if (migrated.dose !== undefined && !migrated.espresso) {
      migrated.espresso = {
        dose: migrated.dose || "",
        cupYield: migrated.cupYield || "",
        clicks: migrated.clicks || "",
        roast: migrated.roast || "medium",
        extractionTime: migrated.extractionTime || "",
        crema: migrated.crema || "ideal",
        taste: migrated.taste || "2",
      };
      migrated.v60 = { dose: "", cupYield: "", clicks: "", roast: "medium", extractionTime: "", taste: "2" };
      
      const keysToRemove = ["dose", "cupYield", "clicks", "roast", "extractionTime", "crema", "taste"];
      keysToRemove.forEach(k => delete migrated[k]);
    }
    
    // Garante as chaves vitais
    if (!migrated.espresso) migrated.espresso = { dose: "", cupYield: "", clicks: "", roast: "medium", extractionTime: "", crema: "ideal", taste: "2" };
    if (!migrated.v60) migrated.v60 = { dose: "", cupYield: "", clicks: "", roast: "medium", extractionTime: "", taste: "2" };
    if (!migrated.method) migrated.method = "espresso";

    return migrated;
  };

  const updateUI = useCallback((currentInputs) => {
    const method = currentInputs.method || "espresso";
    const methodData = currentInputs[method];
    
    const dose = parseFloat(methodData.dose) || 0;
    const cupYield = parseFloat(methodData.cupYield) || 0;
    const clicks = parseInt(methodData.clicks) || 8;
    const roast = methodData.roast;
    const tasteValue = parseInt(methodData.taste) || 2;
    const actualTime = parseInt(methodData.extractionTime) || (method === "espresso" ? 28 : 135);
    const crema = methodData.crema;

    const calculatedRatio = dose > 0 && cupYield > 0 ? (cupYield / dose).toFixed(1) : 0;
    const targetTimeText = method === "espresso" ? "25-35s" : "2:00 - 2:30 min (120-150s)";

    setInitialSettings(
      <ul className="list-disc list-inside space-y-1">
        <li>Método: <b className="capitalize">{method}</b></li>
        <li>Dose: <b>{dose}g</b></li>
        <li>Rendimento na Xícara: <b className="text-lg text-blue-600">{cupYield}g</b></li>
        <li>Proporção Calculada: <b className="text-blue-600">1:{calculatedRatio}</b></li>
        <li>Seu Tempo Real: <b className="text-lg text-blue-600">{actualTime}s</b> (Alvo: {targetTimeText})</li>
      </ul>
    );

    let diagnosisContent;

    const roastTip = {
      light: "Torras claras são densas e difíceis de extrair. Use água mais quente (93-96°C).",
      dark: "Torras escuras extraem muito rápido e amargam fácil. Baixe a temperatura da água (88-90°C).",
      medium: "Torras médias são equilibradas. Água a 92°C costuma ser o ponto de partida ideal.",
    };

    if (method === "espresso") {
      const getCremaFeedback = () => {
        if (crema === "pale") return "A crema pálida e rala indica sub-extração ou temperatura da água muito baixa.";
        if (crema === "dark") return "Crema muito escura com manchas brancas aponta para super-extração ou temperatura muito alta.";
        if (crema === "bubbly") return "Crema com bolhas grandes indica grãos muito frescos (excesso de CO2).";
        return "Crema com cor de avelã e densa sugere boa extração dos óleos.";
      };

      if (tasteValue === 2 && actualTime >= 25 && actualTime <= 35) {
        diagnosisContent = (
          <>
            <h3 className="font-semibold text-lg mb-2 text-green-700">Diagnóstico: Extração Calibrada</h3>
            <p className="text-sm mb-2">Tempo de {actualTime}s e sabor equilibrado. Você encontrou a janela (sweet spot).</p>
            <ul className="list-disc list-inside text-sm space-y-3">
              <li><b>Próximo passo:</b> Trave o moedor em <b>{clicks} cliques</b>.</li>
              <li><b>Visual:</b> {getCremaFeedback()}</li>
              <li><b>Dica Pro:</b> Use a técnica RDT (borrifar 1-2 gotas de água nos grãos) para zerar a retenção estática no moedor.</li>
            </ul>
          </>
        );
      } else if (actualTime < 25) {
        diagnosisContent = (
          <>
            <h3 className="font-semibold text-lg mb-2 text-orange-600">Diagnóstico: Sub-extração (Fluxo Rápido)</h3>
            <p className="text-sm mb-2">Tempo curto de {actualTime}s. A água passou muito rápido, resultando em sabor azedo ou salgado.</p>
            <ul className="list-disc list-inside text-sm space-y-3">
              <li><b>Ação Principal:</b> Moer mais fino. Reduza para <b>{clicks - 1} cliques</b>.</li>
              <li><b>Análise:</b> {getCremaFeedback()}</li>
              <li><b>Distribuição:</b> Certifique-se de usar WDT para evitar canalização.</li>
            </ul>
          </>
        );
      } else if (actualTime > 35) {
        diagnosisContent = (
          <>
            <h3 className="font-semibold text-lg mb-2 text-brown-700">Diagnóstico: Super-extração (Fluxo Lento)</h3>
            <p className="text-sm mb-2">Tempo longo de {actualTime}s. O fluxo foi restrito demais, extraindo compostos amargos/adstringentes.</p>
            <ul className="list-disc list-inside text-sm space-y-3">
              <li><b>Ação Principal:</b> Moer mais grosso. Aumente para <b>{clicks + 1} cliques</b>.</li>
              <li><b>Alternativa:</b> Se moer mais grosso deixar o café ralo, mantenha os cliques e diminua a dose em 0.5g.</li>
              <li><b>Temperatura:</b> {roastTip[roast]}</li>
            </ul>
          </>
        );
      } else {
        diagnosisContent = (
          <>
            <h3 className="font-semibold text-lg mb-2 text-red-600">Diagnóstico: Canalização Provável</h3>
            <p className="text-sm mb-2">Tempo de {actualTime}s ideal, mas o sabor avaliado foi ruim (azedo/amargo). Sintoma clássico de canalização severa.</p>
            <ul className="list-disc list-inside text-sm space-y-3">
              <li><b>Ação Principal:</b> Não altere a moagem. O erro está na compactação/distribuição.</li>
              <li><b>Técnica:</b> Use agulha WDT até o fundo. O tamper deve descer 100% reto.</li>
            </ul>
          </>
        );
      }
    } else if (method === "v60") {
      if (actualTime >= 120 && actualTime <= 150) {
        diagnosisContent = (
          <>
            <h3 className="font-semibold text-lg mb-2 text-green-700">Diagnóstico: V60 Concentrado Ideal</h3>
            <p className="text-sm mb-2">Tempo de {actualTime}s cravado na meta para proporções curtas.</p>
            <ul className="list-disc list-inside text-sm space-y-3">
              <li><b>Sabor:</b> Corpo denso próximo ao do expresso, mas com a clareza do papel.</li>
              <li><b>Dica de Temperatura:</b> {roastTip[roast]}</li>
            </ul>
          </>
        );
      } else if (actualTime > 150) {
        diagnosisContent = (
          <>
            <h3 className="font-semibold text-lg mb-2 text-orange-600">Diagnóstico: Choking (Entupimento)</h3>
            <p className="text-sm mb-2">Tempo de {actualTime}s é muito longo. O filtro de papel no suporte reteve o fluxo.</p>
            <ul className="list-disc list-inside text-sm space-y-3">
              <li><b>Ação Principal:</b> Moagem mais grossa. Tente <b>{clicks + 1} cliques</b>.</li>
              <li><b>Técnica:</b> Evite agitar muito a cama de café (swirl) durante os despejos para não forçar finos para o fundo.</li>
            </ul>
          </>
        );
      } else {
        diagnosisContent = (
          <>
            <h3 className="font-semibold text-lg mb-2 text-blue-600">Diagnóstico: Sub-extração por Fluxo Rápido</h3>
            <p className="text-sm mb-2">Com {actualTime}s, a água desceu rápido demais, resultando num café ácido.</p>
            <ul className="list-disc list-inside text-sm space-y-3">
              <li><b>Ação Principal:</b> Afine a moagem para <b>{clicks - 1} cliques</b>.</li>
              <li><b>Técnica:</b> Divida o despejo de água em 2 ou 3 etapas para diminuir a pressão hidrostática.</li>
            </ul>
          </>
        );
      }
    }

    setDiagnosis(diagnosisContent);
  }, []);

  /** Handlers de Input especializados por escopo de dados */
  const handleTopLevelChange = (e) => {
    const { id, value } = e.target;
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleMethodChange = (e) => {
    const value = e.target.value;
    setInputs((prev) => {
      const newInputs = { ...prev, method: value };
      updateUI(newInputs);
      return newInputs;
    });
  };

  const handleExtractionChange = (e) => {
    const { id, value } = e.target;
    setInputs((prev) => {
      const newInputs = { 
        ...prev, 
        [prev.method]: { ...prev[prev.method], [id]: value } 
      };
      updateUI(newInputs);
      return newInputs;
    });
  };

  const handleAccessoryChange = (e) => {
    const { value, checked } = e.target;
    setInputs((prev) => {
      const newAcc = checked 
        ? [...prev.accessories, value] 
        : prev.accessories.filter(a => a !== value);
      return { ...prev, accessories: newAcc };
    });
  };

  const handleFiles = (files) => {
    const newFiles = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (uploadedFiles.find((f) => f.name === file.name && f.size === file.size)) continue;
      newFiles.push(file);
    }
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (fileName) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  const startCamera = async () => {
    if (!("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices)) {
      alert("Seu navegador não suporta a API de câmera.");
      return;
    }
    try {
      const constraints = { video: { facingMode: "environment" } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStreamRef.current = stream;
      setCameraModalOpen(true);
      setTimeout(() => {
        if (cameraFeedRef.current) cameraFeedRef.current.srcObject = stream;
      }, 50);
    } catch (err) {
      console.error("Erro ao acessar a câmera: ", err);
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (cameraFeedRef.current) {
      cameraFeedRef.current.srcObject = null;
    }
    cameraStreamRef.current = null;
    setCameraModalOpen(false);
  };

  const saveLocally = (data) => {
    try {
      localStorage.setItem("meuexpresso.settings", JSON.stringify(data));
      setFirebaseError("Configurações salvas localmente (Firebase indisponível).");
    } catch (e) {
      console.error("Erro ao salvar localmente:", e);
    }
  };

  const loadLocally = () => {
    try {
      const raw = localStorage.getItem("meuexpresso.settings");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    const doLoad = async () => {
      setIsLoading(true);
      try {
        if (!db || firebaseUnavailableRef.current) {
          const local = loadLocally();
          if (local && mounted) {
            const migrated = migrateLegacyData(local);
            setInputs(migrated);
            updateUI(migrated);
            setFirebaseError("Carregado configuração local.");
          } else if (mounted) {
            updateUI(inputsRef.current);
          }
          return;
        }

        const docRef = doc(db, "configurations", "default");
        const docSnap = await getDoc(docRef);

        if (!mounted) return;

        if (docSnap.exists()) {
          const migrated = migrateLegacyData(docSnap.data());
          setInputs(migrated);
          updateUI(migrated);
        } else {
          const local = loadLocally();
          if (local && mounted) {
            const migrated = migrateLegacyData(local);
            setInputs(migrated);
            updateUI(migrated);
            setFirebaseError("Nenhuma configuração na nuvem. Usando dados locais.");
            return;
          }
          updateUI(inputsRef.current);
        }
      } catch (error) {
        const msg = String(error?.message || error);
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("insufficient")) {
          firebaseUnavailableRef.current = true;
        }
        const local = loadLocally();
        if (local && mounted) {
          const migrated = migrateLegacyData(local);
          setInputs(migrated);
          updateUI(migrated);
          setFirebaseError("Erro no Firebase. Carregado configuração local.");
        } else if (mounted) {
          updateUI(inputsRef.current);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    doLoad();
    return () => { mounted = false; };
  }, [updateUI]);

  const takePhoto = () => {
    const canvas = photoCanvasRef.current;
    const video = cameraFeedRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        const timestamp = new Date().toISOString();
        const newFile = new File([blob], `captura-${timestamp}.jpg`, { type: "image/jpeg" });
        handleFiles([newFile]);
      },
      "image/jpeg",
      0.95
    );
    stopCamera();
  };

  const fileToGenerativePart = async (file) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type,
      },
    };
  };

  const analyzeWithAI = async () => {
    setAiDiagnosis(
      <div className="p-4 bg-purple-100 rounded-lg animate-pulse">
        <h3 className="font-semibold text-lg mb-2 text-purple-700">Analisando com IA...</h3>
        <p className="text-sm text-purple-600">Enviando parâmetros e imagens para o Gemini AI...</p>
      </div>
    );

    try {
      const imageParts = await Promise.all(uploadedFiles.map(fileToGenerativePart));
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, imageParts }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha na API de análise.");
      }

      const { analysis } = await response.json();
      setAiDiagnosis(
        <div className="ai-content p-4 border border-purple-300 rounded-lg" dangerouslySetInnerHTML={{ __html: analysis }} />
      );
    } catch (error) {
      setAiDiagnosis(
        <div className="p-4 bg-red-100 rounded-lg">
          <h3 className="font-semibold text-lg mb-2 text-red-700">Erro na Análise</h3>
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      );
    }
  };

  const saveSettings = async () => {
    try {
      if (!db || firebaseUnavailableRef.current) {
        setSuccessMessage("Configurações salvas localmente.");
        saveLocally(inputs);
        return;
      }
      const docRef = doc(db, "configurations", "default");
      await setDoc(docRef, inputs);
      setSuccessMessage("Configurações salvas com sucesso no Firebase!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      const msg = String(error?.message || error);
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("insufficient")) {
        firebaseUnavailableRef.current = true;
        saveLocally(inputs);
        alert("Sem permissão de gravação. Salvo localmente.");
      } else {
        alert("Não foi possível salvar as configurações.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-700">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const currentMethodInputs = inputs[inputs.method];

  return (
    <>
      <div className="min-h-screen w-full bg-neutral-50 transition-colors duration-300">
        <div className="flex flex-col space-y-6 w-[90%] md:w-[80%] max-w-3xl mx-auto px-4 py-10">
          
          {firebaseError && !firebaseError.includes("salvas no") && (
            <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-900 shadow-sm">
              <strong>Atenção:</strong> {firebaseError}
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-900 shadow-sm">
              <strong>Sucesso:</strong> {successMessage}
            </div>
          )}

          <header className="mb-4">
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
              Barista de Bolso — Meu Expresso
            </h1>
            <p className="text-sm text-neutral-500 mt-1">Calibre suas extrações de acordo com seu equipamento.</p>
          </header>

          {/* Box 1: Meu Setup */}
          <section className="p-6 bg-white rounded-2xl shadow-sm border border-neutral-200">
            <button 
              onClick={() => setIsSetupOpen(!isSetupOpen)}
              className="w-full flex justify-between items-center focus:outline-none"
              title="Expandir/Recolher Setup"
            >
              <h2 className="text-xl font-medium text-neutral-900">Meu Setup</h2>
              <svg className={`w-5 h-5 text-neutral-500 transition-transform duration-200 ${isSetupOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            
            {isSetupOpen && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-2 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="machine" className="block text-sm font-medium text-neutral-600">Cafeteira / Método Base</label>
                    <input type="text" id="machine" value={inputs.machine} onChange={handleTopLevelChange} placeholder="Ex: Oster Double Digital, V60 Inox" className="mt-1 w-full rounded-lg px-3 py-2 border border-neutral-300 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-200 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="grinder" className="block text-sm font-medium text-neutral-600">Moedor</label>
                    <input type="text" id="grinder" value={inputs.grinder} onChange={handleTopLevelChange} placeholder="Ex: Timemore C3" className="mt-1 w-full rounded-lg px-3 py-2 border border-neutral-300 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-200 outline-none" />
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-4">
                  <label className="block text-sm font-medium text-neutral-600 mb-3">Acessórios</label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-2">Expresso</h4>
                      <div className="space-y-2">
                        {ACCESSORY_LIST.espresso.map(acc => (
                          <label key={acc.id} className="flex items-center space-x-2 text-sm text-neutral-700 cursor-pointer">
                            <input type="checkbox" value={acc.label} checked={inputs.accessories.includes(acc.label)} onChange={handleAccessoryChange} className="rounded text-blue-600 focus:ring-blue-500 border-neutral-300" />
                            <span>{acc.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-2">Filtro / Coado</h4>
                      <div className="space-y-2">
                        {ACCESSORY_LIST.filtro.map(acc => (
                          <label key={acc.id} className="flex items-center space-x-2 text-sm text-neutral-700 cursor-pointer">
                            <input type="checkbox" value={acc.label} checked={inputs.accessories.includes(acc.label)} onChange={handleAccessoryChange} className="rounded text-blue-600 focus:ring-blue-500 border-neutral-300" />
                            <span>{acc.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-2">Geral</h4>
                      <div className="space-y-2">
                        {ACCESSORY_LIST.geral.map(acc => (
                          <label key={acc.id} className="flex items-center space-x-2 text-sm text-neutral-700 cursor-pointer">
                            <input type="checkbox" value={acc.label} checked={inputs.accessories.includes(acc.label)} onChange={handleAccessoryChange} className="rounded text-blue-600 focus:ring-blue-500 border-neutral-300" />
                            <span>{acc.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Box 2: Parâmetros de Extração */}
          <section className="p-6 bg-white rounded-2xl shadow-sm border border-neutral-200">
            <button 
              onClick={() => setIsExtractionOpen(!isExtractionOpen)}
              className="w-full flex justify-between items-center focus:outline-none"
              title="Expandir/Recolher Extração"
            >
              <h2 className="text-xl font-medium text-neutral-900">Extração</h2>
              <svg className={`w-5 h-5 text-neutral-500 transition-transform duration-200 ${isExtractionOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            
            {isExtractionOpen && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                
                <div className="mb-6">
                  <label htmlFor="method" className="block text-sm font-medium text-neutral-600">Modo de Extração</label>
                  <select 
                    id="method" 
                    value={inputs.method} 
                    onChange={handleMethodChange} 
                    className="mt-1 w-full rounded-lg px-3 py-2 border border-neutral-300 bg-neutral-50 text-neutral-900 font-medium outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="espresso">Expresso (Máquina)</option>
                    <option value="v60">Filtro (V60 / Coado)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="dose" className="block text-sm font-medium text-neutral-600">Dose Entrada (g)</label>
                    <input type="number" id="dose" value={currentMethodInputs.dose} onChange={handleExtractionChange} step="0.1" className="mt-1 w-full rounded-lg px-3 py-2 border border-neutral-300 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-200 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="cupYield" className="block text-sm font-medium text-neutral-600">Rendimento Xícara (g)</label>
                    <input type="number" id="cupYield" value={currentMethodInputs.cupYield} onChange={handleExtractionChange} step="0.1" placeholder={inputs.method === "v60" ? "Ex: 120" : "Ex: 30"} className="mt-1 w-full rounded-lg px-3 py-2 border border-neutral-300 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-200 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="clicks" className="block text-sm font-medium text-neutral-600">Moagem (cliques/nível)</label>
                    <input type="number" id="clicks" value={currentMethodInputs.clicks} onChange={handleExtractionChange} className="mt-1 w-full rounded-lg px-3 py-2 border border-neutral-300 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-200 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="roast" className="block text-sm font-medium text-neutral-600">Nível de Torra</label>
                    <select id="roast" value={currentMethodInputs.roast} onChange={handleExtractionChange} className="mt-1 w-full rounded-lg px-3 py-2 border border-neutral-300 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-200 outline-none">
                      <option value="light">Clara</option>
                      <option value="medium">Média</option>
                      <option value="dark">Escura</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="extractionTime" className="block text-sm font-medium text-neutral-600">Tempo Total (s)</label>
                    <input type="number" id="extractionTime" value={currentMethodInputs.extractionTime} onChange={handleExtractionChange} className="mt-1 w-full rounded-lg px-3 py-2 border border-neutral-300 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-200 outline-none" />
                  </div>
                  
                  {inputs.method === "espresso" && (
                    <div>
                      <label htmlFor="crema" className="block text-sm font-medium text-neutral-600">Resultado da Crema</label>
                      <select id="crema" value={currentMethodInputs.crema} onChange={handleExtractionChange} className="mt-1 w-full rounded-lg px-3 py-2 border border-neutral-300 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-200 outline-none">
                        <option value="ideal">Densa e cor de avelã</option>
                        <option value="pale">Pálida e fina</option>
                        <option value="bubbly">Bolhosa / Espumosa</option>
                        <option value="dark">Muito escura / manchada</option>
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label htmlFor="taste" className="block text-sm font-medium text-neutral-600">Resultado do Sabor</label>
                    <input type="range" id="taste" min="1" max="3" value={currentMethodInputs.taste} onChange={handleExtractionChange} className="w-full mt-3 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer" />
                    <div className="flex justify-between text-xs text-neutral-500 mt-2">
                      <span>Ácido (Sub)</span>
                      <span className="font-semibold text-green-700">Equilibrado</span>
                      <span>Amargo (Super)</span>
                    </div>
                  </div>

                  <div className="md:col-span-2 mt-4 pt-4 border-t border-neutral-100">
                    <label className="block text-sm font-medium text-neutral-600 mb-3">Fotos da Extração (Opcional)</label>
                    <div ref={imagePreviewRef} className="flex flex-wrap gap-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden bg-neutral-100 shadow-sm border border-neutral-200">
                          <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                          <button onClick={() => removeFile(file.name)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow">&times;</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 mt-4 flex justify-around items-center gap-2 border-t border-neutral-100 pt-6">
                    <div className="flex flex-col items-center gap-2">
                      <button onClick={saveSettings} title="Salvar Dados na Nuvem" className="w-14 h-14 bg-neutral-800 hover:bg-neutral-900 text-white font-semibold p-3 rounded-full flex items-center justify-center transition-shadow shadow-md">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                      </button>
                      <span className="text-[11px] font-medium text-neutral-600">Salvar</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <label htmlFor="photo-upload" title="Anexar Fotos da Galeria" className="w-14 h-14 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-full flex items-center justify-center transition-transform transform hover:-translate-y-0.5 shadow-md">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                      </label>
                      <span className="text-[11px] font-medium text-neutral-600">Anexar Imagem</span>
                      <input id="photo-upload" type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} />
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                      <button onClick={startCamera} title="Tirar Foto do Equipamento/Crema" className="w-14 h-14 bg-green-600 hover:bg-green-700 text-white font-semibold p-3 rounded-full flex items-center justify-center transition-transform transform hover:-translate-y-0.5 shadow-md">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                      </button>
                      <span className="text-[11px] font-medium text-neutral-600">Câmera</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <button onClick={analyzeWithAI} title="Solicitar Análise da IA Gemini" className="w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white font-semibold p-3 rounded-full flex items-center justify-center transition-transform transform hover:scale-105 shadow-md">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                      </button>
                      <span className="text-[11px] font-medium text-neutral-600">Analisar com IA</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Box 3: Telemetria & Diagnóstico */}
          <section className="p-6 bg-white rounded-2xl shadow-sm border border-neutral-200">
            <button 
              onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
              className="w-full flex justify-between items-center focus:outline-none"
              title="Expandir/Recolher Telemetria"
            >
              <h2 className="text-xl font-medium text-neutral-900">Telemetria & Diagnóstico</h2>
              <svg className={`w-5 h-5 text-neutral-500 transition-transform duration-200 ${isTelemetryOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            
            {isTelemetryOpen && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                <div className="mb-4 text-sm text-neutral-700 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                  {initialSettings}
                </div>
                {aiDiagnosis ? (
                  <div className="mt-6">{aiDiagnosis}</div>
                ) : (
                  <div className="border-t border-neutral-100 pt-4 text-neutral-800">
                    {diagnosis}
                  </div>
                )}
              </div>
            )}
          </section>

        </div>
      </div>

      {isCameraModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 rounded-2xl max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-2 text-center text-neutral-900">Capturar Foto</h3>
            <video id="camera-feed" className="w-full rounded-lg bg-black" autoPlay playsInline ref={cameraFeedRef}></video>
            <div className="mt-4 flex justify-center gap-4">
              <button onClick={takePhoto} className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg">Tirar Foto</button>
              <button onClick={stopCamera} className="bg-neutral-200 text-neutral-800 font-semibold py-2 px-4 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      <canvas id="photo-canvas" className="hidden" ref={photoCanvasRef}></canvas>
    </>
  );
};

export default HomePage;