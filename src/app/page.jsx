"use client";

import React, {useState, useEffect, useRef, useCallback} from "react";
import {db} from "../firebase"; // Importa a instância do Firestore
import {doc, getDoc, setDoc} from "firebase/firestore";

export default function HomePage() {
  // --- ESTADO E REFERÊNCIAS ---
  const [diagnosis, setDiagnosis] = useState(null);
  const [initialSettings, setInitialSettings] = useState(null);
  const [aiDiagnosis, setAiDiagnosis] = useState(null);
  const [firebaseError, setFirebaseError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState("system"); // 'light', 'dark', or 'system'

  // State to hold input values, making them controlled components
  const [inputs, setInputs] = useState({
    // dose: "14.5",
    // ratio: "2",
    // clicks: "8",
    // roast: "medium",
    // extractionTime: "28",
    // crema: "ideal",
    // taste: "2",
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isCameraModalOpen, setCameraModalOpen] = useState(false);

  const imagePreviewRef = useRef(null);
  const cameraFeedRef = useRef(null);
  const photoCanvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const inputsRef = useRef(inputs);
  const firebaseUnavailableRef = useRef(false);

  // keep inputsRef up to date
  useEffect(() => {
    inputsRef.current = inputs;
  }, [inputs]);

  // --- LÓGICA DE CALIBRAÇÃO ---
  const updateUI = useCallback((currentInputs) => {
    const dose = parseFloat(currentInputs.dose) || 14;
    const ratio = parseFloat(currentInputs.ratio) || 2;
    const clicks = parseInt(currentInputs.clicks) || 8;
    const roast = currentInputs.roast;
    const tasteValue = parseInt(currentInputs.taste);
    const actualTime = parseInt(currentInputs.extractionTime) || 28;
    const crema = currentInputs.crema;

    const yieldAmount = (dose * ratio).toFixed(1);

    setInitialSettings(
      <ul className="list-disc list-inside space-y-1">
        <li>
          Dose: <b>{dose}g</b>
        </li>
        <li>
          Proporção: <b>1:{ratio}</b>
        </li>
        <li>
          Quantidade na Xícara (Yield):{" "}
          <b className="text-lg text-blue-600 dark:text-blue-400">
            {yieldAmount}g
          </b>
        </li>
        <li>
          Seu Tempo Real:{" "}
          <b className="text-lg text-blue-600 dark:text-blue-400">
            {actualTime}s
          </b>{" "}
          (Alvo: 22-32s)
        </li>
      </ul>
    );

    let diagnosisContent;

    const roastTip = {
      light:
        "Lembre-se que torras claras são naturalmente mais ácidas e difíceis de extrair.",
      dark: "Torras escuras extraem muito rápido e podem ficar amargas facilmente. Considere usar uma temperatura de água mais baixa, se possível.",
      medium: "",
    };

    const getCremaFeedback = () => {
      if (crema === "pale")
        return "A crema pálida e fina que você observou é um forte indício de sub-extração.";
      if (crema === "dark")
        return "Uma crema muito escura ou manchada é um sintoma clássico de super-extração ou canalização.";
      return "";
    };

    if (crema === "bubbly") {
      diagnosisContent = (
        <>
          <h3 className="font-semibold text-lg mb-2 text-cyan-600">
            Diagnóstico: Café Muito Fresco (Excesso de Gás)
          </h3>
          <p className="text-sm mb-2">
            Uma crema com bolhas grandes que se dissipam rápido geralmente
            indica que o café foi torrado há poucos dias e não teve tempo de
            "descansar" (degasar).
          </p>
          <ul className="list-disc list-inside text-sm space-y-3">
            <li>
              <b>Ação Principal:</b> Espere mais alguns dias antes de usar este
              café. O ideal é aguardar de 7 a 14 dias após a data da torra.
            </li>
            <li>
              <b>Análise Visual:</b> O excesso de CO₂ interfere na extração,
              podendo causar um fluxo irregular e um sabor menos definido, mesmo
              que o tempo esteja correto.
            </li>
            <li>
              <b>Dica:</b> Enquanto espera, você pode tentar uma pré-infusão
              mais longa (se sua máquina permitir) para ajudar a liberar um
              pouco do gás antes da extração principal.
            </li>
          </ul>
        </>
      );
    } else if (tasteValue === 2 && actualTime >= 22 && actualTime <= 32) {
      diagnosisContent = (
        <>
          <h3 className="font-semibold text-lg mb-2 text-yellow-700">
            Diagnóstico: Ponto Ideal Encontrado!
          </h3>
          <p className="text-sm mb-2">
            O sabor está equilibrado e o tempo de extração ({actualTime}s) está
            na faixa perfeita. Ótimo trabalho!
          </p>
          <ul className="list-disc list-inside text-sm space-y-3">
            <li>
              <b>Próximo passo:</b> Mantenha a moagem em <b>{clicks} clicks</b>.
              Você encontrou o ponto de equilíbrio.
            </li>
            <li>
              <b className="text-yellow-700">Análise Visual:</b> Sua crema deve
              ter uma cor de avelã, ser densa e persistente. Isso confirma uma
              extração uniforme e bem-sucedida.
            </li>
            <li>
              <b>Dica de Refinamento:</b> Para um café mais encorpado, aumente a
              dose em 0.5g e ajuste a moagem um pouco mais grossa para manter o
              tempo. Para mais doçura, tente uma proporção ligeiramente menor
              (ex: 1:{(ratio - 0.1).toFixed(1)}).
            </li>
          </ul>
        </>
      );
    } else if (actualTime < 22 && tasteValue === 3) {
      diagnosisContent = (
        <>
          <h3 className="font-semibold text-lg mb-2 text-red-600">
            Diagnóstico: Conflito - Tempo Curto com Sabor Amargo?
          </h3>
          <p className="text-sm mb-2">
            Seus dados são incomuns. Um tempo de extração curto ({actualTime}s)
            quase sempre resulta em <b>acidez</b>, não amargor. Isso pode
            indicar uma <b>canalização severa</b>.
          </p>
          <ul className="list-disc list-inside text-sm space-y-3">
            <li>
              <b>Ação Principal:</b> Ignore a moagem por enquanto. O problema
              está na <b>preparação do pó</b> no filtro.
            </li>
            <li>
              <b className="text-red-600">Explicação:</b> A água provavelmente
              "perfurou" o bolo de café em um ponto, super-extraindo aquela
              pequena parte (causando amargor) enquanto o resto do café ficou
              sub-extraído, resultando em um tempo total baixo.
            </li>
            <li>
              <b>Distribuição (WDT):</b> Use uma ferramenta com agulhas finas
              (ou um clipe de papel desdobrado) para quebrar todos os grumos e
              deixar o pó fofo e nivelado.
            </li>
            <li>
              <b>Tampeamento (Compactação):</b> Garanta que você está
              compactando de forma 100% reta e com pressão consistente. Um
              tamper torto é a principal causa de canalização.
            </li>
          </ul>
        </>
      );
    } else if (actualTime < 22) {
      diagnosisContent = (
        <>
          <h3 className="font-semibold text-lg mb-2 text-orange-600">
            Diagnóstico: Sabor Ácido / Tempo Curto (Sub-extraído)
          </h3>
          <p className="text-sm mb-2">
            O café está azedo/ralo. O tempo de {actualTime}s confirma que a
            extração foi muito rápida. {getCremaFeedback()}
          </p>
          <ul className="list-disc list-inside text-sm space-y-3">
            <li>
              <b>Ação Principal:</b> Moer mais fino. A moagem é o controle
              primário do tempo de extração. Tente reduzir para{" "}
              <b>{clicks - 1} clicks</b>.
            </li>
            <li>
              <b>Objetivo:</b> Aumentar a resistência para que a extração chegue
              à faixa de 22-32 segundos.
            </li>
            <li>
              <b>Dica (Nível de Torra):</b>{" "}
              <span className="italic">
                {roastTip[roast] || "Ajuste a moagem gradualmente."}
              </span>
            </li>
            <li>
              <b>Dica Secundária:</b> Se moer mais fino entupir a máquina, volte
              a moagem para {clicks} clicks e aumente a dose em 0.5g. Mais pó
              também aumenta a resistência.
            </li>
          </ul>
        </>
      );
    } else if (actualTime > 32) {
      diagnosisContent = (
        <>
          <h3 className="font-semibold text-lg mb-2 text-brown-700">
            Diagnóstico: Sabor Amargo / Tempo Longo (Super-extraído)
          </h3>
          <p className="text-sm mb-2">
            O café está amargo/adstringente. O tempo de {actualTime}s confirma
            que a extração foi longa demais. {getCremaFeedback()}
          </p>
          <ul className="list-disc list-inside text-sm space-y-3">
            <li>
              <b>Ação Principal:</b> Moer mais grosso. Isso diminuirá a
              resistência. Tente aumentar para <b>{clicks + 1} clicks</b>.
            </li>
            <li>
              <b>Objetivo:</b> Diminuir a resistência para que a extração
              retorne à faixa de 22-32 segundos.
            </li>
            <li>
              <b>Dica (Nível de Torra):</b>{" "}
              <span className="italic">
                {roastTip[roast] || "Ajuste a moagem gradualmente."}
              </span>
            </li>
            <li>
              <b>Dica Secundária:</b> Se o café continuar amargo mesmo com o
              tempo correto, pode ser uma torra muito escura. Outra opção é
              reduzir a dose em 0.5g.
            </li>
          </ul>
        </>
      );
    } else {
      diagnosisContent = (
        <>
          <h3 className="font-semibold text-lg mb-2 text-red-600">
            Diagnóstico: Possível Canalização!
          </h3>
          <p className="text-sm mb-2">
            Seu tempo de extração ({actualTime}s) está na faixa ideal, mas o
            sabor ainda é ruim. Isso geralmente indica <b>canalização</b>, onde
            a água encontra "caminhos" fáceis no pó, extraindo de forma
            desigual.
          </p>
          <ul className="list-disc list-inside text-sm space-y-3">
            <li>
              <b>Ação Principal:</b> Foque na <b>preparação do pó</b> no filtro.
              Não mude a moagem ainda.
            </li>
            <li>
              <b className="text-red-600">Análise Visual:</b>{" "}
              {getCremaFeedback()} O fluxo pode ter começado rápido e depois
              diminuído, ou você pode ver "jatos" claros saindo do porta-filtro.
            </li>
            <li>
              <b>Distribuição (WDT):</b> Use uma ferramenta com agulhas finas
              (ou um clipe de papel desdobrado) para quebrar todos os grumos e
              deixar o pó fofo e nivelado.
            </li>
            <li>
              <b>Tampeamento (Compactação):</b> Garanta que você está
              compactando de forma 100% reta (paralela à borda do filtro) e com
              pressão consistente. Um tamper torto é a principal causa de
              canalização.
            </li>
          </ul>
        </>
      );
    }
    setDiagnosis(diagnosisContent);
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const {id, value} = e.target;
    const newInputs = {...inputs, [id]: value};
    setInputs(newInputs);
    updateUI(newInputs);
  };

  // --- LÓGICA DE IMAGEM E IA ---
  const handleFiles = (files) => {
    const newFiles = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (
        uploadedFiles.find((f) => f.name === file.name && f.size === file.size)
      )
        continue;
      newFiles.push(file);
    }
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (fileName) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  const startCamera = async () => {
    if (
      !("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices)
    ) {
      alert(
        "Seu navegador não suporta a API de câmera. Por favor, carregue uma foto."
      );
      return;
    }
    try {
      const constraints = {video: {facingMode: "environment"}};
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStreamRef.current = stream;
      // abrir modal e anexar o stream ao elemento de vídeo
      setCameraModalOpen(true);
      setTimeout(() => {
        if (cameraFeedRef.current) cameraFeedRef.current.srcObject = stream;
      }, 50);
    } catch (err) {
      console.error("Erro ao acessar a câmera: ", err);
      alert(
        "Não foi possível acessar a câmera. Verifique as permissões do navegador."
      );
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

  useEffect(() => {
    let mounted = true;

    const doLoad = async () => {
      setIsLoading(true);
      try {
        if (!db) {
          console.warn("Firestore não inicializado. Pulando loadSettings.");
          const local = loadLocally();
          if (local && mounted) {
            setInputs((prev) => ({...prev, ...local}));
            updateUI(local);
            setFirebaseError(
              "Firebase não configurado. Carregado configurações locais."
            );
          } else if (mounted) {
            setFirebaseError(
              "Firebase não configurado. Usando valores padrão locais."
            );
            updateUI(inputsRef.current);
          }
          return;
        }

        if (firebaseUnavailableRef.current) {
          const local = loadLocally();
          if (local && mounted) {
            setInputs((prev) => ({...prev, ...local}));
            updateUI(local);
            setFirebaseError(
              "Firebase sem permissão. Carregado configuração local."
            );
          }
          return;
        }

        const docRef = doc(db, "configurations", "default");
        const docSnap = await getDoc(docRef);

        if (!mounted) return;

        if (docSnap.exists()) {
          const settings = docSnap.data();
          setInputs((prev) => ({...prev, ...settings}));
          updateUI(settings);
        } else {
          const local = loadLocally();
          if (local && mounted) {
            setInputs((prev) => ({...prev, ...local}));
            updateUI(local);
            setFirebaseError(
              "Nenhuma configuração na nuvem. Usando dados locais. Salve para sincronizar."
            );
            return;
          }
          console.log(
            "Nenhum documento de configuração encontrado, usando valores padrão."
          );
          updateUI(inputsRef.current);
        }
      } catch (error) {
        const code = error?.code || null;
        const msg = error?.message || String(error);

        // Detect permission issues explicitly
        const isPermissionError =
          code === "permission-denied" ||
          String(msg).toLowerCase().includes("permission") ||
          String(msg).toLowerCase().includes("insufficient");

        // Log error only the first time to avoid spamming the console
        if (!firebaseUnavailableRef.current) {
          if (!isPermissionError)
            console.error("Erro ao carregar configurações: ", error);
        }

        if (isPermissionError) {
          // mark as unavailable so we stop retrying and logging
          firebaseUnavailableRef.current = true;
          const local = loadLocally();
          if (local && mounted) {
            setInputs((prev) => ({...prev, ...local}));
            updateUI(local);
            setFirebaseError(
              "Sem permissão para acessar o Firebase. Carregado configuração local."
            );
            return;
          }
        }

        const local = loadLocally();
        if (local && mounted) {
          setInputs((prev) => ({...prev, ...local}));
          updateUI(local);
          setFirebaseError(
            "Erro ao carregar do Firebase. Carregado configuração local."
          );
        } else if (mounted) {
          setFirebaseError(
            error?.message || "Erro ao carregar configurações do Firebase."
          );
          updateUI(inputsRef.current);
        }
      } finally {
        // Garante que o loading termine mesmo em caso de erro
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    doLoad();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const newFile = new File([blob], `captura-${timestamp}.jpg`, {
          type: "image/jpeg",
        });
        handleFiles([newFile]);
      },
      "image/jpeg",
      0.95
    );

    stopCamera();
  };

  // Função para converter um arquivo para Base64
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
    setAiDiagnosis(null); // Limpa a análise anterior
    setAiDiagnosis(
      <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg animate-pulse">
        <h3 className="font-semibold text-lg mb-2 text-purple-700 dark:text-purple-300">
          Analisando com IA...
        </h3>
        <p className="text-sm text-purple-600 dark:text-purple-400">
          Aguarde um momento. Estou enviando os dados da sua extração para o
          Gemini AI...
        </p>
      </div>
    );

    try {
      // Converte as imagens para o formato que a API do Gemini espera
      const imageParts = await Promise.all(
        uploadedFiles.map(fileToGenerativePart)
      );

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({inputs, imageParts}), // Envia os inputs e as imagens
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Falha ao comunicar com a API de análise."
        );
      }

      const {analysis} = await response.json();

      setAiDiagnosis(
        <div
          className="ai-content p-4 border border-purple-300 dark:border-purple-700 rounded-lg"
          dangerouslySetInnerHTML={{__html: analysis}}
        />
      );
    } catch (error) {
      console.error("Erro na análise com IA:", error);
      setAiDiagnosis(
        <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <h3 className="font-semibold text-lg mb-2 text-red-700 dark:text-red-300">
            Erro na Análise
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400">
            {error.message}
          </p>
        </div>
      );
    }
  };

  // --- LÓGICA DE SALVAR/CARREGAR E TEMA ---
  const LOCAL_SETTINGS_KEY = "meuexpresso.settings";

  const saveLocally = (data) => {
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(data));
      setFirebaseError(
        "Configurações salvas localmente (Firebase indisponível/sem permissão)."
      );
    } catch (e) {
      console.error("Erro ao salvar localmente:", e);
    }
  };

  const loadLocally = () => {
    try {
      const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error("Erro ao carregar configurações locais:", e);
      return null;
    }
  };
  const saveSettings = async () => {
    try {
      if (!db) {
        setSuccessMessage(
          "Firebase não configurado. As configurações foram salvas localmente."
        );
        saveLocally(inputs);
        return;
      }
      // Usaremos um ID fixo "default" para salvar a configuração do usuário
      const docRef = doc(db, "configurations", "default");
      await setDoc(docRef, inputs);
      setSuccessMessage("Configurações salvas com sucesso no Firebase!");
      setTimeout(() => setSuccessMessage(null), 3000);
      // Adicionar um feedback visual seria uma boa ideia aqui
    } catch (error) {
      console.error("Erro ao salvar configurações: ", error);
      // Se for erro de permissão (permission-denied) ou similar, faz fallback para local
      const msg = error?.message || String(error);
      if (
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("insufficient")
      ) {
        saveLocally(inputs);
        alert(
          "Sem permissão para salvar no Firebase. As configurações foram salvas localmente."
        );
      } else {
        alert("Não foi possível salvar as configurações.");
      }
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  // Effect for theme management
  useEffect(() => {
    const htmlElement = document.documentElement;
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (theme === "dark") {
      htmlElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      htmlElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [theme]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-black dark:to-zinc-900">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-blue-600 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-200">
            Carregando configurações...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen w-full bg-gradient-to-b from-neutral-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-colors duration-300">
        <div className="mx-auto max-w-5xl px-6 py-10">
          {firebaseError && !firebaseError.includes("salvas no Firebase") && (
            <div className="mb-6 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100 shadow-sm">
              <strong>Atenção:</strong> {firebaseError}
            </div>
          )}
          {successMessage && (
            <div className="mb-6 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-100 shadow-sm">
              <strong>Sucesso:</strong> {successMessage}
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Barista de Bolso — Meu Expresso
            </h1>

            <button
              onClick={handleThemeToggle}
              className="p-2 rounded-full bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300/60 transition-shadow shadow-sm"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-6 h-6 text-gray-800 dark:text-gray-200"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v2.25m6.364.364l-1.591 1.591M21 12h-2.25m.364 6.364l-1.591-1.591M12 21v-2.25m-6.364-.364l1.591-1.591M3 12H5.25m-.364-6.364l1.591 1.591M18.75 12a6.75 6.75 0 11-13.5 0 6.75 6.75 0 0113.5 0z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-6 h-6 text-gray-800 dark:text-gray-200"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <section className="p-6 bg-white/80 dark:bg-zinc-900/60 rounded-2xl shadow-[0_6px_18px_rgba(15,23,42,0.06)] border border-transparent dark:border-zinc-800">
              <h2 className="text-xl font-medium mb-4 text-neutral-900 dark:text-neutral-50">
                Ferramenta de Calibração
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="dose"
                    className="block text-sm font-medium text-neutral-600 dark:text-neutral-300"
                  >
                    Dose (g)
                  </label>
                  <input
                    type="number"
                    id="dose"
                    value={inputs.dose}
                    onChange={handleInputChange}
                    step="0.1"
                    className="mt-1 w-full rounded-lg px-3 py-2 border border-transparent bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none shadow-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ratio"
                    className="block text-sm font-medium text-neutral-600 dark:text-neutral-300"
                  >
                    Proporção
                  </label>
                  <input
                    type="number"
                    id="ratio"
                    value={inputs.ratio}
                    onChange={handleInputChange}
                    step="0.1"
                    className="mt-1 w-full rounded-lg px-3 py-2 border border-transparent bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none shadow-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="clicks"
                    className="block text-sm font-medium text-neutral-600 dark:text-neutral-300"
                  >
                    Moagem (clicks)
                  </label>
                  <input
                    type="number"
                    id="clicks"
                    value={inputs.clicks}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg px-3 py-2 border border-transparent bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none shadow-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="roast"
                    className="block text-sm font-medium text-neutral-600 dark:text-neutral-300"
                  >
                    Nível de Torra
                  </label>
                  <select
                    id="roast"
                    value={inputs.roast}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg px-3 py-2 border border-transparent bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none shadow-sm"
                  >
                    <option value="light">Clara</option>
                    <option value="medium">Média</option>
                    <option value="dark">Escura</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="extractionTime"
                    className="block text-sm font-medium text-neutral-600 dark:text-neutral-300"
                  >
                    Tempo de Extração (s)
                  </label>
                  <input
                    type="number"
                    id="extractionTime"
                    value={inputs.extractionTime}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg px-3 py-2 border border-transparent bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none shadow-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="crema"
                    className="block text-sm font-medium text-neutral-600 dark:text-neutral-300"
                  >
                    Resultado da Crema
                  </label>
                  <select
                    id="crema"
                    value={inputs.crema}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg px-3 py-2 border border-transparent bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none shadow-sm"
                  >
                    <option value="ideal">Densa e cor de avelã</option>
                    <option value="pale">Pálida e fina</option>
                    <option value="bubbly">Bolhosa / Espumosa</option>
                    <option value="dark">Muito escura / manchada</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="taste"
                    className="block text-sm font-medium text-neutral-600 dark:text-neutral-300"
                  >
                    Resultado do Sabor
                  </label>
                  <input
                    type="range"
                    id="taste"
                    min="1"
                    max="3"
                    value={inputs.taste}
                    onChange={handleInputChange}
                    className="w-full mt-3 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    <span>Ácido</span>
                    <span className="font-semibold">Ideal</span>
                    <span>Amargo</span>
                  </div>
                </div>

                <div className="md:col-span-2 mt-6 pt-6 border-t border-neutral-100 dark:border-zinc-800">
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-3">
                    Fotos da Extração (Opcional)
                  </label>
                  <div
                    ref={imagePreviewRef}
                    className="mt-2 flex flex-wrap gap-4"
                  >
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="relative w-24 h-24 rounded-lg overflow-hidden bg-neutral-100 dark:bg-zinc-800 shadow-sm"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeFile(file.name)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow"
                          aria-label={`Remover ${file.name}`}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Container dos botões de ação */}
                <div className="md:col-span-2 mt-6 flex justify-between items-center gap-4">
                  {/* Botão Salvar */}
                  <div className="relative group">
                    <button
                      onClick={saveSettings}
                      id="save-btn"
                      className="w-16 h-16 bg-neutral-700 hover:bg-neutral-800 text-white font-semibold p-4 rounded-full flex items-center justify-center transition-shadow shadow-md"
                    >
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                        ></path>
                      </svg>
                    </button>
                    <div className="absolute bottom-full mb-2 w-36 bg-neutral-900 text-white text-xs rounded py-1 px-3 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Salvar Configuração
                    </div>
                  </div>

                  {/* Botão Upload */}
                  <div className="relative group">
                    <label
                      htmlFor="photo-upload"
                      className="w-16 h-16 cursor-pointer bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold p-4 rounded-full flex items-center justify-center transition-transform transform hover:-translate-y-0.5 shadow-md"
                    >
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        ></path>
                      </svg>
                    </label>
                    <div className="absolute bottom-full mb-2 w-36 bg-neutral-900 text-white text-xs rounded py-1 px-3 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Enviar Foto
                    </div>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                  />

                  {/* Botão Câmera */}
                  <div className="relative group">
                    <button
                      onClick={startCamera}
                      id="camera-btn"
                      className="w-16 h-16 bg-green-600 hover:bg-green-700 text-white font-semibold p-4 rounded-full flex items-center justify-center transition-transform transform hover:-translate-y-0.5 shadow-md"
                    >
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        ></path>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path>
                      </svg>
                    </button>
                    <div className="absolute bottom-full mb-2 w-36 bg-neutral-900 text-white text-xs rounded py-1 px-3 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Tirar Foto
                    </div>
                  </div>

                  {/* Botão Analisar com IA */}
                  <div className="relative group">
                    <button
                      onClick={analyzeWithAI}
                      id="analyze-btn"
                      className="w-16 h-16 bg-purple-600 hover:bg-purple-700 text-white font-semibold p-4 rounded-full flex items-center justify-center transition-transform transform hover:scale-105 shadow-md"
                    >
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        ></path>
                      </svg>
                    </button>
                    <div className="absolute bottom-full mb-2 w-36 bg-neutral-900 text-white text-xs rounded py-1 px-3 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Analisar com IA
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="p-6 bg-white/80 dark:bg-zinc-900/60 rounded-2xl shadow-[0_6px_18px_rgba(15,23,42,0.06)] border border-transparent dark:border-zinc-800 h-full">
              <h2 className="text-xl font-medium mb-4 text-neutral-900 dark:text-neutral-50">
                Diagnóstico e Próximo Passo
              </h2>
              <div className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">
                {initialSettings}
              </div>
              {aiDiagnosis ? (
                <div className="mt-6">{aiDiagnosis}</div>
              ) : (
                <div className="border-t border-neutral-100 dark:border-zinc-800 pt-4">
                  <div className="text-neutral-700 dark:text-neutral-300">
                    {diagnosis}
                  </div>
                </div>
              )}
            </section>
          </div>

          <footer className="text-center text-xs text-neutral-500 dark:text-zinc-400 mt-10">
            Feito para Oster + Moedor Manual | Ajustes práticos de calibração |
            v2.0
          </footer>
        </div>
      </div>

      {isCameraModalOpen && (
        <div
          id="camera-modal"
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-2xl max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-2 text-center text-neutral-900 dark:text-neutral-50">
              Capturar Foto
            </h3>
            <video
              id="camera-feed"
              className="w-full rounded-lg bg-black/40"
              autoPlay
              playsInline
              ref={cameraFeedRef}
            ></video>
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={takePhoto}
                id="take-photo-btn"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg inline-flex items-center gap-2 shadow"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  ></path>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                </svg>
                Tirar Foto
              </button>
              <button
                onClick={stopCamera}
                id="cancel-camera-btn"
                className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold py-2 px-4 rounded-lg shadow-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      <canvas
        id="photo-canvas"
        className="hidden"
        ref={photoCanvasRef}
      ></canvas>
    </>
  );
}
