/**
 * @file page.jsx
 * @description Root da aplicação.
 * Implementa visualização em lista com ícone de método em bloco visual (Flexbox) para melhor hierarquia.
 */

"use client";

import React, {useState, useEffect} from "react";
import {db} from "../firebase";
import {doc, getDoc, setDoc} from "firebase/firestore";
import {useAuth} from "../hooks/useAuth";
import Login from "../components/Login";

const ACCESSORY_LIST = {
  espresso: [
    "WDT (Agulhas)",
    "Tamper Pro",
    "Puck Screen",
    "Distribuidor",
    "Funil Magnético",
  ],
  coado: [
    "Chaleira Bico de Ganso",
    "Filtro V60",
    "Filtro Melitta",
    "Filtro Inox",
  ],
  geral: ["Balança de Precisão", "RDT (Borrifador)", "Termômetro"],
};

const translateSensory = (key, value) => {
  const map = {
    acidity: {low: "BAIXA", medium: "EQUILIBRADA", high: "ALTA"},
    bitterness: {low: "BAIXA", medium: "EQUILIBRADA", high: "ALTA"},
    body: {low: "RALO", medium: "MÉDIO", high: "DENSO"},
    cremaColor: {pale: "PÁLIDA", hazelnut: "AVELÃ", dark: "ESCURA"},
    cremaDensity: {thin: "RALA", dense: "DENSA", bubbly: "C/ BOLHAS"},
  };
  return map[key]?.[value] || value;
};

const HomePage = () => {
  const {user, loading: authLoading, loginWithGoogle, logout} = useAuth();

  const [setups, setSetups] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [activeSetupId, setActiveSetupId] = useState("");
  const [isAddingSetup, setIsAddingSetup] = useState(false);
  const [newSetup, setNewSetup] = useState({
    name: "",
    machine: "",
    grinder: "",
    method: "espresso",
    accessories: [],
  });

  const [isExtracting, setIsExtracting] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [editingRecipeId, setEditingRecipeId] = useState(null);

  const [extraction, setExtraction] = useState({
    dose: "",
    cupYield: "",
    clicks: "",
    extractionTime: "",
    sensory: {
      acidity: "medium",
      bitterness: "medium",
      body: "medium",
      cremaColor: "hazelnut",
      cremaDensity: "dense",
    },
  });

  const [aiDiagnosis, setAiDiagnosis] = useState(null);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [promptModal, setPromptModal] = useState({
    isOpen: false,
    title: "",
    inputValue: "",
    onConfirm: null,
  });

  const activeSetup = setups.find((s) => s.id === activeSetupId);

  const saveToFirebase = async (data) => {
    if (!db || !user) return;
    try {
      await setDoc(doc(db, "users", user.uid), data);
    } catch (e) {
      console.error("Erro ao salvar no Firestore", e);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsDbLoading(false);
      return;
    }

    const loadData = async () => {
      setIsDbLoading(true);
      if (db) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setSetups(data.setups || []);
            setRecipes(data.recipes || []);
            setActiveSetupId(data.activeSetupId || "");
          } else {
            setSetups([]);
            setRecipes([]);
            setActiveSetupId("");
          }
        } catch (e) {
          console.error("Erro de leitura.", e);
        }
      }
      setIsDbLoading(false);
    };
    loadData();
  }, [user, authLoading]);

  const resetToHome = () => {
    setIsExtracting(false);
    setViewingRecipe(null);
    setEditingRecipeId(null);
    setAiDiagnosis(null);
  };

  const handleAddSetup = () => {
    if (!newSetup.name) return alert("Dê um nome ao seu setup.");
    const updatedSetups = [...setups, {...newSetup, id: Date.now().toString()}];
    setSetups(updatedSetups);
    setIsAddingSetup(false);
    setNewSetup({
      name: "",
      machine: "",
      grinder: "",
      method: "espresso",
      accessories: [],
    });
    saveToFirebase({setups: updatedSetups, recipes, activeSetupId});
  };

  const requestRemoveSetup = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Setup",
      message:
        "Tem certeza que deseja remover este equipamento? As receitas associadas perderão a referência.",
      onConfirm: () => {
        const updated = setups.filter((s) => s.id !== id);
        setSetups(updated);
        const newActiveId = activeSetupId === id ? "" : activeSetupId;
        setActiveSetupId(newActiveId);
        saveToFirebase({setups: updated, recipes, activeSetupId: newActiveId});
        setConfirmModal({isOpen: false});
      },
    });
  };

  const requestDeleteRecipe = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Receita",
      message: "Esta ação é irreversível. Confirmar exclusão?",
      onConfirm: () => {
        const updatedRecipes = recipes.filter((r) => r.id !== id);
        setRecipes(updatedRecipes);
        if (viewingRecipe?.id === id) resetToHome();
        saveToFirebase({setups, recipes: updatedRecipes, activeSetupId});
        setConfirmModal({isOpen: false});
      },
    });
  };

  const requestSaveRecipe = () => {
    const existingRecipe = recipes.find((r) => r.id === editingRecipeId);

    setPromptModal({
      isOpen: true,
      title: editingRecipeId
        ? "Atualizar Nome da Receita"
        : "Nome da Nova Receita",
      inputValue: existingRecipe ? existingRecipe.name : "",
      onConfirm: (val) => {
        if (!val.trim()) return;

        let updatedRecipes;
        if (editingRecipeId) {
          updatedRecipes = recipes.map((r) =>
            r.id === editingRecipeId
              ? {...r, name: val, extraction: {...extraction}}
              : r,
          );
        } else {
          const newRecipe = {
            id: Date.now().toString(),
            name: val,
            setupId: activeSetupId,
            extraction: {...extraction},
            date: new Date().toLocaleDateString("pt-BR"),
          };
          updatedRecipes = [newRecipe, ...recipes];
        }

        setRecipes(updatedRecipes);
        saveToFirebase({setups, recipes: updatedRecipes, activeSetupId});
        setPromptModal({isOpen: false});
        resetToHome();
      },
    });
  };

  const viewRecipeCard = (recipe) => {
    setActiveSetupId(recipe.setupId);
    setExtraction(recipe.extraction);
    setViewingRecipe(recipe);
    setIsExtracting(false);
    setEditingRecipeId(null);
    setAiDiagnosis(null);
  };

  const editRecipe = (recipe) => {
    const setupExists = setups.find((s) => s.id === recipe.setupId);
    if (!setupExists)
      return alert("O setup associado a esta receita foi excluído.");

    setActiveSetupId(recipe.setupId);
    setExtraction(recipe.extraction);
    setEditingRecipeId(recipe.id);
    setViewingRecipe(null);
    setIsExtracting(true);
    setAiDiagnosis(null);
  };

  const startNewExtraction = () => {
    setExtraction({
      dose: "",
      cupYield: "",
      clicks: "",
      extractionTime: "",
      sensory: {
        acidity: "medium",
        bitterness: "medium",
        body: "medium",
        cremaColor: "hazelnut",
        cremaDensity: "dense",
      },
    });
    setEditingRecipeId(null);
    setViewingRecipe(null);
    setAiDiagnosis(null);
    setIsExtracting(true);
  };

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    setAiDiagnosis(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({extraction, activeSetup}),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const generatedAnalysis = data.analysis;
      setAiDiagnosis(generatedAnalysis);

      if (viewingRecipe) {
        const updatedRecipe = {...viewingRecipe, diagnosis: generatedAnalysis};
        const updatedRecipes = recipes.map((r) =>
          r.id === viewingRecipe.id ? updatedRecipe : r,
        );
        setRecipes(updatedRecipes);
        setViewingRecipe(updatedRecipe);
        saveToFirebase({setups, recipes: updatedRecipes, activeSetupId});
      } else {
        setIsExtracting(false);
      }
    } catch (e) {
      setAiDiagnosis(
        `<div class="p-4 bg-red-50 text-red-600 rounded-xl font-bold">Erro: ${e.message}</div>`,
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (authLoading || isDbLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-500 font-medium">
        Iniciando Laboratório...
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={loginWithGoogle} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-sm text-neutral-600 mb-6">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({isOpen: false})}
                className="flex-1 bg-neutral-100 text-neutral-700 py-3 rounded-xl font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-red-200"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {promptModal.isOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-neutral-900 mb-4">
              {promptModal.title}
            </h3>
            <input
              autoFocus
              className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 mb-6"
              value={promptModal.inputValue}
              onChange={(e) =>
                setPromptModal({...promptModal, inputValue: e.target.value})
              }
            />
            <div className="flex gap-3">
              <button
                onClick={() => setPromptModal({isOpen: false})}
                className="flex-1 bg-neutral-100 text-neutral-700 py-3 rounded-xl font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => promptModal.onConfirm(promptModal.inputValue)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-200"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <header className="flex justify-between items-center mb-8">
          <div onClick={resetToHome} className="cursor-pointer group">
            <h1 className="text-3xl font-black text-neutral-900 tracking-tighter group-hover:text-blue-600 transition-colors">
              BARISTA PRO
            </h1>
            <p className="text-xs text-neutral-500 font-medium bg-neutral-200 inline-block px-2 py-1 rounded mt-1">
              {user.email}
            </p>
          </div>
          <button
            onClick={logout}
            className="text-xs font-bold text-neutral-400 hover:text-red-500 transition-colors"
          >
            SAIR
          </button>
        </header>

        {!isExtracting && !viewingRecipe && (
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-200 animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-neutral-800">
                Meus Equipamentos
              </h2>
              <button
                onClick={() => setIsAddingSetup(!isAddingSetup)}
                className="bg-neutral-900 text-white text-xs px-4 py-2 rounded-full font-bold hover:bg-blue-600 transition-colors"
              >
                {isAddingSetup ? "FECHAR" : "ADICIONAR"}
              </button>
            </div>

            {isAddingSetup && (
              <div className="bg-neutral-50 p-4 rounded-2xl mb-6 space-y-4 animate-in slide-in-from-top-2">
                <input
                  placeholder="Apelido (ex: Setup da Oster)"
                  className="w-full p-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newSetup.name}
                  onChange={(e) =>
                    setNewSetup({...newSetup, name: e.target.value})
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="p-3 bg-white border border-neutral-200 rounded-xl"
                    value={newSetup.method}
                    onChange={(e) =>
                      setNewSetup({
                        ...newSetup,
                        method: e.target.value,
                        accessories: [],
                      })
                    }
                  >
                    <option value="espresso">Expresso</option>
                    <option value="coado">Coado / Filtro</option>
                  </select>
                  <input
                    placeholder="Máquina"
                    className="p-3 bg-white border border-neutral-200 rounded-xl"
                    value={newSetup.machine}
                    onChange={(e) =>
                      setNewSetup({...newSetup, machine: e.target.value})
                    }
                  />
                </div>
                <input
                  placeholder="Moedor"
                  className="p-3 bg-white border border-neutral-200 rounded-xl w-full"
                  value={newSetup.grinder}
                  onChange={(e) =>
                    setNewSetup({...newSetup, grinder: e.target.value})
                  }
                />

                <div className="space-y-2">
                  <p className="text-xs font-bold text-neutral-400 uppercase">
                    Acessórios para {newSetup.method}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ...ACCESSORY_LIST[newSetup.method],
                      ...ACCESSORY_LIST.geral,
                    ].map((acc) => (
                      <label
                        key={acc}
                        className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border text-sm cursor-pointer hover:border-blue-500"
                      >
                        <input
                          type="checkbox"
                          checked={newSetup.accessories.includes(acc)}
                          onChange={(e) => {
                            const list = e.target.checked
                              ? [...newSetup.accessories, acc]
                              : newSetup.accessories.filter((a) => a !== acc);
                            setNewSetup({...newSetup, accessories: list});
                          }}
                        />{" "}
                        {acc}
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleAddSetup}
                  className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-100"
                >
                  SALVAR SETUP
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <select
                value={activeSetupId}
                onChange={(e) => {
                  setActiveSetupId(e.target.value);
                  saveToFirebase({
                    setups,
                    recipes,
                    activeSetupId: e.target.value,
                  });
                }}
                className="flex-1 p-4 bg-neutral-100 border-none rounded-2xl font-bold text-neutral-700 outline-none ring-2 ring-transparent focus:ring-blue-500"
              >
                <option value="">Selecione um Perfil...</option>
                {setups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.method === "espresso" ? "☕" : "💧"})
                  </option>
                ))}
              </select>
              {activeSetupId && (
                <button
                  onClick={() => requestRemoveSetup(activeSetupId)}
                  className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
                >
                  🗑️
                </button>
              )}
            </div>
          </section>
        )}

        {!isExtracting && !viewingRecipe && recipes.length > 0 && (
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-200 animate-in fade-in">
            <h2 className="text-lg font-bold text-neutral-800 mb-4">
              Minhas Receitas
            </h2>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {recipes.map((recipe) => {
                const setup = setups.find((s) => s.id === recipe.setupId);
                const methodIcon = setup?.method === "espresso" ? "☕" : "💧";
                return (
                  <div
                    key={recipe.id}
                    className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl border border-neutral-100 group"
                  >
                    <div
                      className="cursor-pointer flex-1 flex items-center gap-3"
                      onClick={() => viewRecipeCard(recipe)}
                    >
                      <div className="flex items-center justify-center w-10 h-10 bg-white rounded-xl border border-neutral-200 shadow-sm text-lg shrink-0">
                        {methodIcon}
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-800 text-sm group-hover:text-blue-600 transition-colors leading-tight">
                          {recipe.name}
                        </h4>
                        <p className="text-[10px] text-neutral-400 font-medium mt-1">
                          {recipe.date} • {setup?.name || "Desconhecido"} •
                          Dose: {recipe.extraction.dose}g • Tempo:{" "}
                          {recipe.extraction.extractionTime}s
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => editRecipe(recipe)}
                        className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-2 rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => requestDeleteRecipe(recipe.id)}
                        className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-2 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        X
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeSetup && !isExtracting && !viewingRecipe && (
          <button
            onClick={startNewExtraction}
            className="w-full bg-neutral-900 text-white p-5 rounded-2xl font-black text-lg shadow-lg hover:bg-neutral-800 transition-all active:scale-95 flex items-center justify-center gap-3 animate-in fade-in"
          >
            <span className="text-2xl">+</span> NOVA EXTRAÇÃO
          </button>
        )}

        {activeSetup && isExtracting && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">
                  {editingRecipeId
                    ? "Editando Configuração"
                    : "Configuração da Extração"}
                </h2>
                <button
                  onClick={resetToHome}
                  className="text-xs font-bold text-neutral-400 hover:text-neutral-600"
                >
                  FECHAR
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase">
                    Dose (g)
                  </label>
                  <input
                    type="number"
                    className="w-full p-3 bg-neutral-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="18"
                    value={extraction.dose}
                    onChange={(e) =>
                      setExtraction({...extraction, dose: e.target.value})
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase">
                    Rendimento (g)
                  </label>
                  <input
                    type="number"
                    className="w-full p-3 bg-neutral-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="36"
                    value={extraction.cupYield}
                    onChange={(e) =>
                      setExtraction({...extraction, cupYield: e.target.value})
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase">
                    Tempo (s)
                  </label>
                  <input
                    type="number"
                    className="w-full p-3 bg-neutral-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="28"
                    value={extraction.extractionTime}
                    onChange={(e) =>
                      setExtraction({
                        ...extraction,
                        extractionTime: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase">
                    Moagem (cliques)
                  </label>
                  <input
                    type="number"
                    className="w-full p-3 bg-neutral-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8"
                    value={extraction.clicks}
                    onChange={(e) =>
                      setExtraction({...extraction, clicks: e.target.value})
                    }
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-200">
              <h2 className="text-lg font-bold mb-2">Avaliação Sensorial</h2>
              <p className="text-xs text-neutral-500 mb-6">
                Avalie o resultado final na xícara.
              </p>

              <div className="space-y-6">
                {[
                  {
                    key: "acidity",
                    label: "Acidez",
                    desc: "Azedo?",
                    colors: "bg-yellow-400",
                    opts: ["BAIXA", "EQUILIBRADA", "ALTA"],
                  },
                  {
                    key: "bitterness",
                    label: "Amargor",
                    desc: "Queimado?",
                    colors: "bg-orange-600",
                    opts: ["BAIXA", "EQUILIBRADA", "ALTA"],
                  },
                  {
                    key: "body",
                    label: "Corpo",
                    desc: "Textura?",
                    colors: "bg-neutral-800",
                    opts: ["RALO", "MÉDIO", "DENSO"],
                  },
                ].map((sens) => (
                  <div key={sens.key} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="font-bold text-neutral-800">
                        {sens.label}
                      </span>
                      <span className="text-[10px] text-neutral-400 uppercase">
                        {sens.desc}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {["low", "medium", "high"].map((level, i) => (
                        <button
                          key={level}
                          onClick={() =>
                            setExtraction({
                              ...extraction,
                              sensory: {
                                ...extraction.sensory,
                                [sens.key]: level,
                              },
                            })
                          }
                          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                            extraction.sensory[sens.key] === level
                              ? `${sens.colors} text-white shadow-md`
                              : "bg-neutral-100 text-neutral-400"
                          }`}
                        >
                          {sens.opts[i]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {activeSetup.method === "espresso" && (
                  <div className="space-y-6 pt-4 border-t border-neutral-100">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-amber-800">
                          Cor da Crema
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {val: "pale", label: "Pálida"},
                          {val: "hazelnut", label: "Avelã"},
                          {val: "dark", label: "Escura"},
                        ].map((c) => (
                          <button
                            key={c.val}
                            onClick={() =>
                              setExtraction({
                                ...extraction,
                                sensory: {
                                  ...extraction.sensory,
                                  cremaColor: c.val,
                                },
                              })
                            }
                            className={`py-3 rounded-xl text-xs font-black transition-all ${
                              extraction.sensory.cremaColor === c.val
                                ? `bg-amber-600 text-white shadow-md`
                                : "bg-amber-50 text-amber-700/50"
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-amber-800">
                          Densidade da Crema
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {val: "thin", label: "Rala"},
                          {val: "dense", label: "Densa"},
                          {val: "bubbly", label: "Bolhas"},
                        ].map((c) => (
                          <button
                            key={c.val}
                            onClick={() =>
                              setExtraction({
                                ...extraction,
                                sensory: {
                                  ...extraction.sensory,
                                  cremaDensity: c.val,
                                },
                              })
                            }
                            className={`py-3 rounded-xl text-xs font-black transition-all ${
                              extraction.sensory.cremaDensity === c.val
                                ? `bg-amber-600 text-white shadow-md`
                                : "bg-amber-50 text-amber-700/50"
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={requestSaveRecipe}
                  className="flex-1 bg-green-100 text-green-700 p-4 rounded-2xl font-black text-sm shadow-sm hover:bg-green-200 active:scale-95 transition-all flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-lg leading-none">💾</span> SALVAR
                </button>
                <button
                  onClick={analyzeWithAI}
                  disabled={isAnalyzing}
                  className="flex-[2] bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
                >
                  {isAnalyzing ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
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
                      ANALISANDO...
                    </>
                  ) : (
                    "🪄 GERAR LAUDO"
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {viewingRecipe && (
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-200 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start mb-6 border-b border-neutral-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-neutral-800">
                  {viewingRecipe.name}
                </h2>
                <p className="text-xs text-neutral-500 mt-1 font-medium">
                  {viewingRecipe.date} •{" "}
                  {setups.find((s) => s.id === viewingRecipe.setupId)?.name ||
                    "Setup Desconhecido"}
                </p>
              </div>
              <button
                onClick={resetToHome}
                className="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-3 py-2 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                FECHAR
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-black text-neutral-400 uppercase">
                  Dose
                </p>
                <p className="font-bold text-neutral-900">
                  {viewingRecipe.extraction.dose}g
                </p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-black text-neutral-400 uppercase">
                  Rendimento
                </p>
                <p className="font-bold text-neutral-900">
                  {viewingRecipe.extraction.cupYield}g
                </p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-black text-neutral-400 uppercase">
                  Moagem
                </p>
                <p className="font-bold text-neutral-900">
                  {viewingRecipe.extraction.clicks} clks
                </p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-black text-neutral-400 uppercase">
                  Tempo
                </p>
                <p className="font-bold text-neutral-900">
                  {viewingRecipe.extraction.extractionTime}s
                </p>
              </div>
            </div>

            <h3 className="text-sm font-bold text-neutral-800 mb-3">
              Matriz Sensorial
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="px-3 py-2 bg-yellow-50 rounded-lg">
                <p className="text-[10px] text-yellow-600 font-bold uppercase">
                  Acidez
                </p>
                <p className="text-xs font-black text-yellow-800">
                  {translateSensory(
                    "acidity",
                    viewingRecipe.extraction.sensory.acidity,
                  )}
                </p>
              </div>
              <div className="px-3 py-2 bg-orange-50 rounded-lg">
                <p className="text-[10px] text-orange-600 font-bold uppercase">
                  Amargor
                </p>
                <p className="text-xs font-black text-orange-800">
                  {translateSensory(
                    "bitterness",
                    viewingRecipe.extraction.sensory.bitterness,
                  )}
                </p>
              </div>
              <div className="px-3 py-2 bg-neutral-100 rounded-lg">
                <p className="text-[10px] text-neutral-500 font-bold uppercase">
                  Corpo
                </p>
                <p className="text-xs font-black text-neutral-800">
                  {translateSensory(
                    "body",
                    viewingRecipe.extraction.sensory.body,
                  )}
                </p>
              </div>
              {viewingRecipe.extraction.sensory.cremaColor && (
                <div className="px-3 py-2 bg-amber-50 rounded-lg">
                  <p className="text-[10px] text-amber-600 font-bold uppercase">
                    Crema
                  </p>
                  <p className="text-[10px] font-black text-amber-800 leading-tight">
                    {translateSensory(
                      "cremaColor",
                      viewingRecipe.extraction.sensory.cremaColor,
                    )}
                    <br />
                    {translateSensory(
                      "cremaDensity",
                      viewingRecipe.extraction.sensory.cremaDensity,
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={analyzeWithAI}
                disabled={isAnalyzing}
                className="flex-[2] bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-xl font-black text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="opacity-25"
                      ></circle>
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        className="opacity-75"
                      ></path>
                    </svg>
                    ANALISANDO...
                  </>
                ) : (
                  "🪄 GERAR LAUDO"
                )}
              </button>

              {viewingRecipe.diagnosis && (
                <button
                  onClick={() => setAiDiagnosis(viewingRecipe.diagnosis)}
                  className="flex-1 bg-purple-100 text-purple-700 p-4 rounded-xl font-black text-sm hover:bg-purple-200 transition-colors"
                >
                  👁️ VER ÚLTIMO
                </button>
              )}

              <button
                onClick={() => editRecipe(viewingRecipe)}
                className="flex-1 bg-neutral-100 text-neutral-800 p-4 rounded-xl font-black text-sm hover:bg-neutral-200 transition-colors"
              >
                EDITAR RECEITA
              </button>
            </div>

            {aiDiagnosis && !isAnalyzing && (
              <div className="mt-8 border-t border-neutral-100 pt-6 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg font-black flex items-center gap-3 text-neutral-800">
                    <span className="bg-purple-100 text-lg p-2 rounded-xl shadow-sm">
                      🤖
                    </span>{" "}
                    Laudo IA
                  </h3>
                  <button
                    onClick={() => setAiDiagnosis(null)}
                    className="text-[10px] font-bold text-neutral-400 bg-neutral-50 px-3 py-1.5 rounded-lg hover:bg-neutral-100"
                  >
                    OCULTAR
                  </button>
                </div>
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{__html: aiDiagnosis}}
                />
              </div>
            )}
          </section>
        )}

        {aiDiagnosis && !isAnalyzing && !viewingRecipe && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-500 mt-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500"></div>
            <div className="flex justify-between items-start mb-6 border-b border-neutral-100 pb-4">
              <h3 className="text-xl font-black flex items-center gap-3 text-neutral-800">
                <span className="bg-purple-100 text-xl p-2.5 rounded-xl shadow-sm">
                  🤖
                </span>{" "}
                Laudo IA
              </h3>
              <button
                onClick={() => setAiDiagnosis(null)}
                className="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-3 py-1.5 rounded-lg hover:bg-neutral-200"
              >
                FECHAR
              </button>
            </div>
            <div
              className="w-full"
              dangerouslySetInnerHTML={{__html: aiDiagnosis}}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
