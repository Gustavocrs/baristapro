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
  const [theme, setTheme] = useState("system"); // 'light', 'dark', or 'system'

  // State to hold input values, making them controlled components
  const [inputs, setInputs] = useState({
    dose: "14.5",
    ratio: "2",
    clicks: "8",
    roast: "medium",
    extractionTime: "28",
    crema: "ideal",
    taste: "2",
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isCameraModalOpen, setCameraModalOpen] = useState(false);

  const imagePreviewRef = useRef(null);
  const cameraFeedRef = useRef(null);
  const photoCanvasRef = useRef(null);
  const cameraStreamRef = useRef(null);

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
          Dose: <b>${dose}g</b>
        </li>
        <li>
          Proporção: <b>1:${ratio}</b>
        </li>
        <li>
          Quantidade na Xícara (Yield):{" "}
          <b className="text-lg text-blue-600 dark:text-blue-400">
            ${yieldAmount}g
          </b>
        </li>
        <li>
          Seu Tempo Real:{" "}
          <b className="text-lg text-blue-600 dark:text-blue-400">
            ${actualTime}s
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
      // Abrimos o modal antes de garantir attach para evitar problemas de ref nulo
      setCameraModalOpen(true);
      // small timeout para garantir que o video element esteja montado
      setTimeout(() => {
        if (cameraFeedRef.current) {
          cameraFeedRef.current.srcObject = stream;
        }
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
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (cameraFeedRef.current) {
      cameraFeedRef.current.srcObject = null;
    }
    cameraStreamRef.current = null;
    setCameraModalOpen(false);
  };

  // Ensure the video element gets the stream when modal opens
  useEffect(() => {
    if (isCameraModalOpen && cameraStreamRef.current && cameraFeedRef.current) {
      cameraFeedRef.current.srcObject = cameraStreamRef.current;
    }
    // when modal is closed remove stream from video element
    if (!isCameraModalOpen && cameraFeedRef.current) {
      cameraFeedRef.current.srcObject = null;
    }
  }, [isCameraModalOpen]);

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

  const analyzeWithAI = async () => {
    setAiDiagnosis(
      <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg animate-pulse">
        <h3 className="font-semibold text-lg mb-2 text-purple-700 dark:text-purple-300">
          Analisando com IA...
        </h3>
        <p className="text-sm text-purple-600 dark:text-purple-400">
          Aguarde um momento. Estou combinando os dados da sua extração com as
          fotos para gerar um diagnóstico detalhado.
        </p>
      </div>
    );

    setTimeout(() => {
      const aiResponse = (
        <>
          <h3 className="font-semibold text-lg mb-2 text-purple-700 dark:text-purple-300">
            Análise da IA (Exemplo)
          </h3>
          <div className="space-y-3 text-sm">
            <p>
              Com base nos seus parâmetros, a extração parece estar no caminho
              certo. O tempo de {inputs.extractionTime}s é bom. No entanto, a
              foto da crema sugere uma leve canalização na borda direita do
              filtro, indicada por uma área mais clara.
            </p>
            <p>
              <strong>Sugestão Principal:</strong> Melhore a distribuição do pó
              de café (WDT) antes de compactar. Certifique-se de que o pó esteja
              uniformemente distribuído e sem grumos para evitar a canalização.
            </p>
            <p>
              <strong>Ajuste Fino:</strong> Se o sabor ainda pender para o
              ácido, mesmo com a distribuição corrigida, considere aumentar a
              temperatura da água em 1-2 graus Celsius, se sua máquina permitir,
              para auxiliar na extração de torras mais claras como a que você
              está usando.
            </p>
          </div>
        </>
      );
      setAiDiagnosis(
        <div className="p-4 border border-purple-300 dark:border-purple-700 rounded-lg">
          {aiResponse}
        </div>
      );
    }, 2500);
  };

  // --- LÓGICA DE SALVAR/CARREGAR E TEMA ---
  const saveSettings = async () => {
    try {
      if (!db) {
        alert(
          "Firebase não está configurado. As configurações serão salvas localmente apenas temporariamente."
        );
        // Como fallback simples, podemos salvar no localStorage
        localStorage.setItem("meuexpresso.settings", JSON.stringify(inputs));
        return;
      }
      // Usaremos um ID fixo "default" para salvar a configuração do usuário
      const docRef = doc(db, "configurations", "default");
      await setDoc(docRef, inputs);
      console.log("Configurações salvas com sucesso no Firebase!");
      // Adicionar um feedback visual seria uma boa ideia aqui
    } catch (error) {
      console.error("Erro ao salvar configurações: ", error);
      alert("Não foi possível salvar as configurações.");
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      if (!db) {
        console.warn("Firestore não inicializado. Pulando loadSettings.");
        setFirebaseError(
          "Firebase não configurado. Usando valores padrão locais."
        );
        updateUI(inputs);
        return;
      }

      const docRef = doc(db, "configurations", "default");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const settings = docSnap.data();
        setInputs((prev) => ({...prev, ...settings}));
        updateUI(settings); // Atualiza a UI com os dados carregados
      } else {
        console.log(
          "Nenhum documento de configuração encontrado, usando valores padrão."
        );
        updateUI(inputs); // Garante que a UI seja renderizada com os padrões
      }
    } catch (error) {
      console.error("Erro ao carregar configurações: ", error);
      // Tratamento de erro: configura mensagem para UI e usa padrões locais
      setFirebaseError(
        error?.message || "Erro ao carregar configurações do Firebase."
      );
      updateUI(inputs); // Renderiza com os padrões em caso de erro
    }
  }, [updateUI, inputs]);

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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

  return (
    <>
      <div className="max-w-7xl mx-auto p-6">
        {firebaseError && (
          <div className="mb-4 p-3 rounded-md bg-yellow-100 border border-yellow-300 text-yellow-800">
            <strong>Atenção:</strong> {firebaseError}
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">
            ☕ Guia de Calibração de Expresso
          </h1>
          <button
            onClick={handleThemeToggle}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
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
          <section className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg h-full">
            <h2 className="text-xl font-semibold mb-4">
              Ferramenta de Calibração
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="dose" className="block font-medium">
                  Dose (g)
                </label>
                <input
                  type="number"
                  id="dose"
                  value={inputs.dose}
                  onChange={handleInputChange}
                  step="0.1"
                  className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700"
                />
              </div>
              <div>
                <label htmlFor="ratio" className="block font-medium">
                  Proporção
                </label>
                <input
                  type="number"
                  id="ratio"
                  value={inputs.ratio}
                  onChange={handleInputChange}
                  step="0.1"
                  className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700"
                />
              </div>
              <div>
                <label htmlFor="clicks" className="block font-medium">
                  Moagem (clicks)
                </label>
                <input
                  type="number"
                  id="clicks"
                  value={inputs.clicks}
                  onChange={handleInputChange}
                  className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700"
                />
              </div>
              <div>
                <label htmlFor="roast" className="block font-medium">
                  Nível de Torra
                </label>
                <select
                  id="roast"
                  value={inputs.roast}
                  onChange={handleInputChange}
                  className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700"
                >
                  <option value="light">Clara</option>
                  <option value="medium">Média</option>
                  <option value="dark">Escura</option>
                </select>
              </div>
              <div>
                <label htmlFor="extractionTime" className="block font-medium">
                  Tempo de Extração (s)
                </label>
                <input
                  type="number"
                  id="extractionTime"
                  value={inputs.extractionTime}
                  onChange={handleInputChange}
                  className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700"
                />
              </div>
              <div>
                <label htmlFor="crema" className="block font-medium">
                  Resultado da Crema
                </label>
                <select
                  id="crema"
                  value={inputs.crema}
                  onChange={handleInputChange}
                  className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700"
                >
                  <option value="ideal">Densa e cor de avelã</option>
                  <option value="pale">Pálida e fina</option>
                  <option value="bubbly">Bolhosa / Espumosa</option>
                  <option value="dark">Muito escura / manchada</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="taste" className="block font-medium">
                  Resultado do Sabor
                </label>
                <input
                  type="range"
                  id="taste"
                  min="1"
                  max="3"
                  value={inputs.taste}
                  onChange={handleInputChange}
                  className="w-full mt-2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Ácido</span>
                  <span className="font-bold">Ideal</span>
                  <span>Amargo</span>
                </div>
              </div>
              <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="block font-medium mb-2">
                  Fotos da Extração (Opcional)
                </label>
                <div
                  ref={imagePreviewRef}
                  className="mt-4 flex flex-wrap gap-4"
                >
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="relative w-24 h-24">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover rounded-md shadow-md"
                      />
                      <button
                        onClick={() => removeFile(file.name)}
                        className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 mt-6 grid grid-cols-2 gap-4">
                <label
                  htmlFor="photo-upload"
                  className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-2"
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
                  Carregar Foto
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <button
                  onClick={startCamera}
                  id="camera-btn"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-2"
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
                  Usar Câmera
                </button>
                <div className="col-span-2 mt-2">
                  <button
                    onClick={analyzeWithAI}
                    id="analyze-btn"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-transform transform hover:scale-105"
                  >
                    <svg
                      className="w-6 h-6"
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
                    Analisar com IA
                  </button>
                </div>
                <div className="col-span-2 mt-2">
                  <button
                    onClick={saveSettings}
                    id="save-btn"
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
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
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      ></path>
                    </svg>
                    Salvar Configuração
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg h-full">
            <h2 className="text-xl font-semibold mb-4">
              Diagnóstico e Próximo Passo
            </h2>
            <div className="mb-4 text-sm">{initialSettings}</div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div>{diagnosis}</div>
            </div>
            <div className="mt-6">{aiDiagnosis}</div>
          </section>
        </div>

        <footer className="text-center text-xs text-gray-500 mt-8">
          Feito para Oster + Moedor Manual | Ajustes práticos de calibração |
          v2.0
        </footer>
      </div>

      {isCameraModalOpen && (
        <div
          id="camera-modal"
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-2 text-center">
              Capturar Foto
            </h3>
            <video
              id="camera-feed"
              className="w-full rounded-md bg-gray-900"
              autoPlay
              playsInline
              ref={cameraFeedRef}
            ></video>
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={takePhoto}
                id="take-photo-btn"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md inline-flex items-center gap-2"
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
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md"
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
