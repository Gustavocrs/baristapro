/**
 * @file page.jsx
 * @description Gerenciamento de setups, extração sensorial e persistência de receitas.
 */

"use client";

import React, {useState, useEffect} from "react";
import {db} from "../firebase";
import {doc, getDoc, setDoc} from "firebase/firestore";

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

const HomePage = () => {
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

  const [extraction, setExtraction] = useState({
    dose: "",
    cupYield: "",
    clicks: "",
    extractionTime: "",
    sensory: {acidity: "medium", bitterness: "medium", body: "medium"},
  });

  const [aiDiagnosis, setAiDiagnosis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const saveToFirebase = async (data) => {
    if (!db) {
      localStorage.setItem("barista_local_data", JSON.stringify(data));
      return;
    }
    try {
      await setDoc(doc(db, "users", "config_barista"), data);
    } catch (e) {
      localStorage.setItem("barista_local_data", JSON.stringify(data));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      let data = null;
      if (db) {
        try {
          const snap = await getDoc(doc(db, "users", "config_barista"));
          if (snap.exists()) data = snap.data();
        } catch (e) {
          console.warn(
            "Firebase bloqueado ou inacessível. Usando local storage.",
          );
        }
      }
      if (!data) {
        const local = localStorage.getItem("barista_local_data");
        if (local) data = JSON.parse(local);
      }
      if (data) {
        setSetups(data.setups || []);
        setRecipes(data.recipes || []);
        setActiveSetupId(data.activeSetupId || "");
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

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

  const removeSetup = (id) => {
    const updated = setups.filter((s) => s.id !== id);
    setSetups(updated);
    const newActiveId = activeSetupId === id ? "" : activeSetupId;
    setActiveSetupId(newActiveId);
    saveToFirebase({setups: updated, recipes, activeSetupId: newActiveId});
  };

  const handleSaveRecipe = () => {
    if (!activeSetupId)
      return alert("Selecione um setup antes de salvar a receita.");

    const recipeName = prompt("Nome da Receita (Ex: Etiópia 15 clicks):");
    if (!recipeName) return;

    const newRecipe = {
      id: Date.now().toString(),
      name: recipeName,
      setupId: activeSetupId,
      extraction: {...extraction},
      date: new Date().toLocaleDateString("pt-BR"),
    };

    const updatedRecipes = [newRecipe, ...recipes];
    setRecipes(updatedRecipes);
    saveToFirebase({setups, recipes: updatedRecipes, activeSetupId});
  };

  const loadRecipe = (recipe) => {
    const setupExists = setups.find((s) => s.id === recipe.setupId);
    if (!setupExists) {
      return alert(
        "O setup associado a esta receita foi excluído. Crie um novo setup similar.",
      );
    }
    setActiveSetupId(recipe.setupId);
    setExtraction(recipe.extraction);
    saveToFirebase({setups, recipes, activeSetupId: recipe.setupId});
  };

  const deleteRecipe = (id) => {
    const updatedRecipes = recipes.filter((r) => r.id !== id);
    setRecipes(updatedRecipes);
    saveToFirebase({setups, recipes: updatedRecipes, activeSetupId});
  };

  const activeSetup = setups.find((s) => s.id === activeSetupId);

  const analyzeWithAI = async () => {
    if (!activeSetup) return alert("Selecione um setup ativo.");

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
      setAiDiagnosis(data.analysis);
    } catch (e) {
      setAiDiagnosis(
        `<div class="p-4 bg-red-50 text-red-600 rounded-xl font-bold">Erro: ${e.message}</div>`,
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-500 font-medium">
        Iniciando Laboratório...
      </div>
    );

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-neutral-900 tracking-tighter">
            BARISTA PRO
          </h1>
          <p className="text-neutral-500">
            Gestão de Setup & Calibração Sensorial
          </p>
        </header>

        {/* SEÇÃO: MEUS SETUPS */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-200">
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
                className="w-full p-3 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={newSetup.name}
                onChange={(e) =>
                  setNewSetup({...newSetup, name: e.target.value})
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="p-3 bg-white border rounded-xl"
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
                  className="p-3 bg-white border rounded-xl"
                  value={newSetup.machine}
                  onChange={(e) =>
                    setNewSetup({...newSetup, machine: e.target.value})
                  }
                />
              </div>
              <input
                placeholder="Moedor"
                className="p-3 bg-white border rounded-xl w-full"
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
                onClick={() => removeSetup(activeSetupId)}
                className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
              >
                🗑️
              </button>
            )}
          </div>
        </section>

        {/* SEÇÃO: RECEITAS SALVAS */}
        {recipes.length > 0 && (
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-200">
            <h2 className="text-lg font-bold text-neutral-800 mb-4">
              Minhas Receitas
            </h2>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl border border-neutral-100"
                >
                  <div
                    className="cursor-pointer flex-1"
                    onClick={() => loadRecipe(recipe)}
                  >
                    <h4 className="font-bold text-neutral-800 text-sm">
                      {recipe.name}
                    </h4>
                    <p className="text-[10px] text-neutral-400 font-medium">
                      {recipe.date} • Dose: {recipe.extraction.dose}g • Tempo:{" "}
                      {recipe.extraction.extractionTime}s
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => loadRecipe(recipe)}
                      className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      USAR
                    </button>
                    <button
                      onClick={() => deleteRecipe(recipe.id)}
                      className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SEÇÃO: EXTRAÇÃO E MATRIZ SENSORIAL */}
        {activeSetup && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Parâmetros de Extração</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase">
                    Dose Entrada (g)
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
              <h2 className="text-lg font-bold mb-2">O que você sentiu?</h2>
              <p className="text-xs text-neutral-500 mb-6">
                Seja honesto com seu paladar, a IA cuidará do resto.
              </p>

              <div className="space-y-6">
                {[
                  {
                    key: "acidity",
                    label: "Acidez",
                    desc: "Língua pinicando ou salivação intensa?",
                    colors: "bg-yellow-400",
                  },
                  {
                    key: "bitterness",
                    label: "Amargor",
                    desc: "Sensação de remédio ou café queimado?",
                    colors: "bg-orange-600",
                  },
                  {
                    key: "body",
                    label: "Corpo",
                    desc: "Textura: Chá ralo ou Leite cremoso?",
                    colors: "bg-neutral-800",
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
                      {["low", "medium", "high"].map((level) => (
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
                              ? `${sens.colors} text-white scale-105 shadow-md`
                              : "bg-neutral-100 text-neutral-400"
                          }`}
                        >
                          {level === "low"
                            ? "BAIXA"
                            : level === "medium"
                              ? "EQUILIBRADA"
                              : "ALTA"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleSaveRecipe}
                  className="flex-1 bg-green-100 text-green-700 p-4 rounded-2xl font-black text-sm shadow-sm hover:bg-green-200 active:scale-95 transition-all"
                >
                  💾 SALVAR RECEITA
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
                      ANALISANDO...
                    </>
                  ) : (
                    "🪄 ANALISAR EXTRAÇÃO"
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ÁREA DE DIAGNÓSTICO ESTILIZADA */}
        {aiDiagnosis && !isAnalyzing && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-500 mt-8">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-neutral-800 border-b border-neutral-100 pb-4">
              <span className="bg-purple-100 text-xl p-2.5 rounded-xl shadow-sm">
                🤖
              </span>{" "}
              Laudo do Barista AI
            </h3>
            {/* O wrapper não usa 'prose' para não sobrescrever o Tailwind gerado pela IA */}
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
