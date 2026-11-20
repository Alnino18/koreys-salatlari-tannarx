/**
 * Koreys Salatlari Tannarx Kalkulyatori (app.js)
 * 
 * Ushbu fayl ilovaning barcha hisob-kitob, ma'lumotlar boshqaruvi,
 * Retseptlar konstruktori (Recipe Builder), Lokal AI Agent (Offline Texnolog),
 * Chart.js vizualizatsiyasi, Excel eksporti va bosmaga chiqarish
 * mantiqiy yadrosini tashkil qiladi.
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. ASOSIY HOLAT (STATE) VA KONSTANTALAR
  // ==========================================================================

  const STORAGE_KEYS = {
    MATERIALS: 'korean_salads_materials_v1',
    RECIPES: 'korean_salads_recipes_v1',
    ACTIVE_RECIPE: 'korean_salads_active_recipe_v1',
    BATCH_KG: 'korean_salads_batch_kg_v1',
    MARKUP_PERCENT: 'korean_salads_markup_percent_v1',
    GEMINI_API_KEY: 'korean_salads_gemini_api_key_v1'
  };

  const State = {
    materials: [],
    recipes: [],
    activeRecipeId: 'recipe_morkovcha',
    batchKg: 10.0,
    markupPercent: 40.0,
    materialsFilter: 'all',
    materialsSearch: '',
    currentCalculations: null,
    charts: {
      breakdown: null,
      topIngredients: null,
      comparison: null
    },
    // Tasdiqlash modali uchun callback
    confirmCallback: null
  };

  // Retsept konstruktori (Recipe Builder) uchun vaqtinchalik holat
  const RecipeBuilderState = {
    ingredients: []
  };

  // ==========================================================================
  // 2. MA'LUMOTLARNI YUKLASH VA LOCALSTORAGE SINKRONIZATSIYASI
  // ==========================================================================

  function getCatalog() {
    if (typeof window.AppCatalog === 'undefined') {
      console.error("AppCatalog (data.js) topilmadi!");
      return null;
    }
    return window.AppCatalog;
  }

  const APP_VERSION = 'v5.1_production_ready';

  function initData() {
    const catalog = getCatalog();

    // Versiya mos kelmasa yoki birinchi yuklanganda eski xotirani tozalash (API kalitni saqlagan holda)
    const savedApiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY);
    if (localStorage.getItem('app_version') !== APP_VERSION) {
      localStorage.clear();
      localStorage.setItem('app_version', APP_VERSION);
      if (savedApiKey) {
        localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, savedApiKey);
      }
    }

    // 1. Xomashyo bazasini yuklash
    const savedMaterials = localStorage.getItem(STORAGE_KEYS.MATERIALS);
    if (savedMaterials !== null) {
      try {
        const parsed = JSON.parse(savedMaterials);
        State.materials = (Array.isArray(parsed) && parsed.length > 0)
          ? parsed
          : (catalog && catalog.DEFAULT_RAW_MATERIALS ? catalog.DEFAULT_RAW_MATERIALS.map(m => Object.assign({}, m)) : []);
      } catch (e) {
        State.materials = catalog && catalog.DEFAULT_RAW_MATERIALS ? catalog.DEFAULT_RAW_MATERIALS.map(m => Object.assign({}, m)) : [];
      }
    } else {
      State.materials = catalog && catalog.DEFAULT_RAW_MATERIALS ? catalog.DEFAULT_RAW_MATERIALS.map(m => Object.assign({}, m)) : [];
    }

    // 2. Retseptlar bazasini yuklash
    const savedRecipes = localStorage.getItem(STORAGE_KEYS.RECIPES);
    if (savedRecipes !== null) {
      try {
        const parsed = JSON.parse(savedRecipes);
        State.recipes = (Array.isArray(parsed) && parsed.length > 0)
          ? parsed
          : (catalog && catalog.DEFAULT_RECIPES ? catalog.DEFAULT_RECIPES.map(r => catalog.helpers.cloneDeep(r)) : []);
      } catch (e) {
        State.recipes = catalog && catalog.DEFAULT_RECIPES ? catalog.DEFAULT_RECIPES.map(r => catalog.helpers.cloneDeep(r)) : [];
      }
    } else {
      State.recipes = catalog && catalog.DEFAULT_RECIPES ? catalog.DEFAULT_RECIPES.map(r => catalog.helpers.cloneDeep(r)) : [];
    }

    // 3. Tanlangan retseptni yuklash
    const savedActiveId = localStorage.getItem(STORAGE_KEYS.ACTIVE_RECIPE);
    if (savedActiveId && State.recipes.some(r => r.id === savedActiveId)) {
      State.activeRecipeId = savedActiveId;
    } else if (State.recipes.length > 0) {
      State.activeRecipeId = State.recipes[0].id;
    } else {
      State.activeRecipeId = '';
    }

    // 4. Partiya hajmi va ustama
    const savedBatch = localStorage.getItem(STORAGE_KEYS.BATCH_KG);
    State.batchKg = (savedBatch && !isNaN(parseNumberInput(savedBatch))) ? Math.max(0.1, parseNumberInput(savedBatch)) : 10.0;

    const savedMarkup = localStorage.getItem(STORAGE_KEYS.MARKUP_PERCENT);
    State.markupPercent = (savedMarkup && !isNaN(parseNumberInput(savedMarkup))) ? Math.max(0, parseNumberInput(savedMarkup)) : 40.0;

    saveState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(State.materials));
      localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(State.recipes));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_RECIPE, State.activeRecipeId || '');
      localStorage.setItem(STORAGE_KEYS.BATCH_KG, State.batchKg.toString());
      localStorage.setItem(STORAGE_KEYS.MARKUP_PERCENT, State.markupPercent.toString());
    } catch (e) {
      console.error("LocalStorage-ga saqlashda xatolik:", e);
    }
  }

  function resetToDefaults() {
    const savedApiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY);
    localStorage.clear();
    localStorage.setItem('app_version', APP_VERSION);
    if (savedApiKey) {
      localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, savedApiKey);
    }

    const catalog = getCatalog();
    State.materials = catalog && catalog.DEFAULT_RAW_MATERIALS ? catalog.DEFAULT_RAW_MATERIALS.map(m => Object.assign({}, m)) : [];
    State.recipes = catalog && catalog.DEFAULT_RECIPES ? catalog.DEFAULT_RECIPES.map(r => catalog.helpers.cloneDeep(r)) : [];
    State.activeRecipeId = State.recipes.length > 0 ? State.recipes[0].id : '';
    State.batchKg = 10.0;
    State.markupPercent = 40.0;
    State.currentCalculations = null;

    saveState();
    syncUIWithState();
    renderAll();
    showToast("Ma'lumotlar standart holatga (zavod sozlamalariga) qaytarildi!", "info");
  }

  // ==========================================================================
  // 3. YORDAMCHI VA TEZKOR QIDIRUV METODLARI
  // ==========================================================================

  function getRawMaterialsMap() {
    const map = {};
    State.materials.forEach(m => {
      map[m.id] = m;
    });
    return map;
  }

  function getActiveRecipe() {
    return State.recipes.find(r => r.id === State.activeRecipeId) || State.recipes[0] || null;
  }

  function formatMoney(amount) {
    const val = Math.round(Number(amount) || 0);
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so'm";
  }

  function formatKg(weight) {
    const w = Number(weight) || 0;
    if (w < 1.0 && w > 0) {
      return (w * 1000).toFixed(0) + " g";
    }
    return w.toFixed(2).replace(/\.?0+$/, '') + " kg";
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseNumberInput(val, fallback = 0) {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    const str = String(val).trim().replace(',', '.');
    if (str === '') return fallback;
    const num = parseFloat(str);
    return isNaN(num) ? fallback : num;
  }

  // ==========================================================================
  // 4. ASOSIY KALKULYATSIYA MANTIQI (CALCULATION ENGINE)
  // ==========================================================================

  function calculateRecipe(recipe, batchKg, markupPercent) {
    if (!recipe) return null;

    const materialsMap = getRawMaterialsMap();
    const baseOutput = Number(recipe.batchOutputKg) || 10.0;
    const targetBatch = Number(batchKg) > 0 ? Number(batchKg) : 10.0;
    const scale = targetBatch / baseOutput;

    // 1. Xomashyo xarajatlari
    let rawMaterialsTotalCost = 0;
    let totalGrossWeight = 0;
    let totalNetWeight = 0;

    const calculatedIngredients = (recipe.ingredients || []).map((ing, idx) => {
      const mat = materialsMap[ing.materialId] || null;
      const unitPrice = mat ? (Number(mat.pricePerUnit) || 0) : (Number(ing.unitPrice) || 0);
      
      const rawUnit = (ing.unit || (mat && mat.unit) || 'kg').toLowerCase().trim();
      const isGram = (rawUnit === 'gr' || rawUnit === 'g' || rawUnit === 'gram' || rawUnit === 'gramm');

      const gross = (Number(ing.grossWeight) || 0) * scale;
      const wastePercent = Number(ing.wastePercent) || 0;
      
      // Netto = Brutto * (1 - waste / 100)
      const wp = Math.max(0, Math.min(99.9, wastePercent));
      const net = gross * (1 - wp / 100);

      // Agar o'lchov birligi gramm bo'lsa, tannarx va umumiy vaznga kg da (1000 ga bo'lib) qo'shiladi
      const effectiveGrossKg = isGram ? (gross / 1000) : gross;
      const effectiveNetKg = isGram ? (net / 1000) : net;
      const cost = Math.round(effectiveGrossKg * unitPrice);

      rawMaterialsTotalCost += cost;
      totalGrossWeight += effectiveGrossKg;
      totalNetWeight += effectiveNetKg;

      return {
        index: idx,
        materialId: ing.materialId,
        nameUz: ing.nameUz || (mat && mat.nameUz) || "Noma'lum xomashyo",
        nameRu: ing.nameRu || (mat && mat.nameRu) || "",
        unit: ing.unit || (mat && mat.unit) || 'kg',
        unitPrice: unitPrice,
        grossWeight: Number(gross.toFixed(3)),
        wastePercent: wastePercent,
        netWeight: Number(net.toFixed(3)),
        cost: cost,
        notes: ing.notes || ""
      };
    });

    // 2. Ish haqi xarajatlari
    const ops = recipe.operationalCosts || {};
    const laborRatePerKg = ops.laborPerKg !== undefined ? Number(ops.laborPerKg) : 2000;
    const totalLaborCost = Math.round(laborRatePerKg * targetBatch);

    // 3. Kommunal, Transport va Qo'shimcha xarajatlar
    const utilitiesRate = ops.utilitiesPerKg !== undefined ? Number(ops.utilitiesPerKg) : 500;
    const transportRate = ops.transportPerKg !== undefined ? Number(ops.transportPerKg) : 500;
    const depreciationRate = ops.depreciationPerKg !== undefined ? Number(ops.depreciationPerKg) : 200;
    const overheadRate = ops.overheadPerKg !== undefined ? Number(ops.overheadPerKg) : 300;

    const totalUtilitiesCost = Math.round(utilitiesRate * targetBatch);
    const totalTransportCost = Math.round(transportRate * targetBatch);
    const totalDepreciationCost = Math.round(depreciationRate * targetBatch);
    const totalOverheadCost = Math.round(overheadRate * targetBatch);

    const operationalTotalCost = totalLaborCost + totalUtilitiesCost + totalTransportCost + totalDepreciationCost + totalOverheadCost;

    // 4. Qadoqlash xarajatlari
    const pack = recipe.packagingConfig || {};
    const isBulk = (pack.defaultType === 'bulk' || (Number(pack.containerUnitCost) === 0 && (Number(pack.labelUnitCost) === 0 || pack.includeLabel === false)));
    const portionSizeKg = Number(pack.portionSizeKg) || 0.50;
    const containersNeeded = isBulk ? 0 : Math.ceil(targetBatch / (portionSizeKg > 0 ? portionSizeKg : 0.50));

    let containerUnitCost = Number(pack.containerUnitCost);
    if (isNaN(containerUnitCost) || containerUnitCost < 0) {
      if (pack.defaultType === 'bulk') {
        containerUnitCost = 0;
      } else {
        const containerMat = materialsMap[pack.containerMaterialId];
        containerUnitCost = containerMat ? containerMat.pricePerUnit : 1100;
      }
    }

    let labelUnitCost = Number(pack.labelUnitCost);
    if (isNaN(labelUnitCost) || labelUnitCost < 0) {
      if (pack.defaultType === 'bulk' || pack.includeLabel === false) {
        labelUnitCost = 0;
      } else {
        const labelMat = materialsMap[pack.labelMaterialId];
        labelUnitCost = labelMat ? labelMat.pricePerUnit : 200;
      }
    }

    let bagUnitCost = Number(pack.bagUnitCost);
    if (isNaN(bagUnitCost) || bagUnitCost < 0) {
      if (pack.defaultType === 'bulk' || pack.includeBag === false) {
        bagUnitCost = 0;
      } else {
        const bagMat = materialsMap[pack.bagMaterialId];
        bagUnitCost = bagMat ? bagMat.pricePerUnit : 100;
      }
    }

    const containersCost = isBulk ? 0 : (containersNeeded * containerUnitCost);
    const labelsCost = (isBulk || pack.includeLabel === false) ? 0 : (containersNeeded * labelUnitCost);
    const bagsCost = (isBulk || pack.includeBag === false) ? 0 : (containersNeeded * bagUnitCost);
    const packagingTotalCost = containersCost + labelsCost + bagsCost;

    // 5. Jami tannarx
    const totalBatchCost = rawMaterialsTotalCost + operationalTotalCost + packagingTotalCost;
    const costPerKg = targetBatch > 0 ? Math.round(totalBatchCost / targetBatch) : 0;
    const costPerPortion = isBulk ? 0 : (containersNeeded > 0 ? Math.round(totalBatchCost / containersNeeded) : 0);

    // 6. Savdo ustamasi, sotish narxi va foyda
    const markup = Number(markupPercent) >= 0 ? Number(markupPercent) : 40.0;
    const recommendedSellingPricePerKg = Math.round(costPerKg * (1 + markup / 100));
    const recommendedSellingPriceTotal = Math.round(totalBatchCost * (1 + markup / 100));
    const recommendedSellingPricePerPortion = isBulk
      ? 0
      : (containersNeeded > 0 ? Math.round(recommendedSellingPriceTotal / containersNeeded) : 0);

    const netProfitTotal = recommendedSellingPriceTotal - totalBatchCost;
    const netProfitPerKg = recommendedSellingPricePerKg - costPerKg;
    const profitabilityMarginPercent = recommendedSellingPriceTotal > 0
      ? Number(((netProfitTotal / recommendedSellingPriceTotal) * 100).toFixed(1))
      : 0;

    // 7. Xarajatlar taqsimoti (Ulushlar %)
    const costBreakdownPercent = {
      rawMaterials: totalBatchCost > 0 ? Number(((rawMaterialsTotalCost / totalBatchCost) * 100).toFixed(1)) : 0,
      labor: totalBatchCost > 0 ? Number(((totalLaborCost / totalBatchCost) * 100).toFixed(1)) : 0,
      packaging: totalBatchCost > 0 ? Number(((packagingTotalCost / totalBatchCost) * 100).toFixed(1)) : 0,
      utilities: totalBatchCost > 0 ? Number(((totalUtilitiesCost / totalBatchCost) * 100).toFixed(1)) : 0,
      transport: totalBatchCost > 0 ? Number(((totalTransportCost / totalBatchCost) * 100).toFixed(1)) : 0,
      depreciation: totalBatchCost > 0 ? Number(((totalDepreciationCost / totalBatchCost) * 100).toFixed(1)) : 0,
      other: totalBatchCost > 0 ? Number((((totalUtilitiesCost + totalTransportCost + totalDepreciationCost + totalOverheadCost) / totalBatchCost) * 100).toFixed(1)) : 0
    };

    return {
      recipeId: recipe.id,
      recipeCode: recipe.code || 'REC',
      recipeNameUz: recipe.nameUz,
      recipeNameRu: recipe.nameRu || '',
      category: recipe.category || 'Salat',
      targetBatchKg: targetBatch,
      scaleFactor: scale,
      instructions: recipe.instructions || recipe.descriptionUz || '',

      ingredients: calculatedIngredients,
      totalGrossWeight: Number(totalGrossWeight.toFixed(3)),
      totalNetWeight: Number(totalNetWeight.toFixed(3)),

      rawMaterialsTotalCost,
      totalLaborCost,
      totalUtilitiesCost,
      totalTransportCost,
      totalDepreciationCost,
      totalOverheadCost,
      otherOperationalTotalCost: totalUtilitiesCost + totalTransportCost + totalDepreciationCost + totalOverheadCost,
      operationalTotalCost,

      packaging: {
        isBulk,
        portionSizeKg,
        containersNeeded,
        containerUnitCost,
        labelUnitCost,
        bagUnitCost,
        containersCost,
        labelsCost,
        bagsCost,
        packagingTotalCost
      },

      totalBatchCost,
      costPerKg,
      costPerPortion,

      markupPercent: markup,
      recommendedSellingPricePerKg,
      recommendedSellingPricePerPortion,
      recommendedSellingPriceTotal,
      netProfitTotal,
      netProfitPerKg,
      profitabilityMarginPercent,
      costBreakdownPercent
    };
  }

  function updateActiveCalculations() {
    const recipe = getActiveRecipe();
    if (!recipe) {
      State.currentCalculations = null;
      renderKPIsAndSummary(null);
      return null;
    }
    State.currentCalculations = calculateRecipe(recipe, State.batchKg, State.markupPercent);
    return State.currentCalculations;
  }

  // ==========================================================================
  // 5. INTERFEYSNI RENDER QILISH (UI RENDERING)
  // ==========================================================================

  function renderRecipeDropdown() {
    const select = document.getElementById('recipe-select');
    const texSelect = document.getElementById('texkarta-recipe-select');
    if (!select) return;

    select.innerHTML = '';
    if (texSelect) texSelect.innerHTML = '';

    if (State.recipes.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = "Hozircha retseptlar yo'q";
      select.appendChild(opt);
      if (texSelect) {
        const optTex = opt.cloneNode(true);
        texSelect.appendChild(optTex);
      }
      const badge = document.getElementById('recipe-category-badge');
      const desc = document.getElementById('recipe-desc-text');
      if (badge) badge.textContent = "Bo'sh";
      if (desc) desc.textContent = "Hozircha hech qanday salat retsepti kiritilmagan. Yuqoridagi \"+ Yangi retsept\" tugmasi orqali o'z salatingizni yarating!";
      return;
    }

    State.recipes.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `${r.nameUz} (${r.category || 'Salat'})`;
      if (r.id === State.activeRecipeId) {
        opt.selected = true;
      }
      select.appendChild(opt);

      if (texSelect) {
        const optTex = opt.cloneNode(true);
        texSelect.appendChild(optTex);
      }
    });

    const active = getActiveRecipe();
    if (active) {
      const badge = document.getElementById('recipe-category-badge');
      const desc = document.getElementById('recipe-desc-text');
      if (badge) badge.textContent = active.category || "Koreys salati";
      if (desc) desc.textContent = active.descriptionUz || active.instructions || "Klassik koreys salati retsepti";
    }
  }

  function renderActiveRecipeMetaInputs() {
    const recipe = getActiveRecipe();
    if (!recipe) {
      const batchInput = document.getElementById('batch-weight-input');
      if (batchInput) batchInput.value = '10';
      const inputLabor = document.getElementById('input-labor-rate');
      const inputUtility = document.getElementById('input-utility-cost');
      const inputTransport = document.getElementById('input-transport-cost');
      const inputDepr = document.getElementById('input-depreciation-cost');
      const inputOverhead = document.getElementById('input-overhead-cost');
      const inputPackCost = document.getElementById('input-packaging-unit-cost');
      const inputLabelCost = document.getElementById('input-label-cost');
      if (inputLabor) inputLabor.value = '0';
      if (inputUtility) inputUtility.value = '0';
      if (inputTransport) inputTransport.value = '0';
      if (inputDepr) inputDepr.value = '0';
      if (inputOverhead) inputOverhead.value = '0';
      if (inputPackCost) inputPackCost.value = '0';
      if (inputLabelCost) inputLabelCost.value = '0';
      return;
    }

    // Partiya hajmi
    const batchInput = document.getElementById('batch-weight-input');
    if (batchInput) batchInput.value = State.batchKg;

    // Ustama
    const markupRange = document.getElementById('markup-range');
    const markupInput = document.getElementById('markup-percent-input');
    const markupLabel = document.getElementById('label-markup-percent');
    if (markupRange) markupRange.value = State.markupPercent;
    if (markupInput) markupInput.value = State.markupPercent;
    if (markupLabel) markupLabel.textContent = State.markupPercent + "%";

    // Operatsion xarajatlar
    const ops = recipe.operationalCosts || {};
    const inputLabor = document.getElementById('input-labor-rate');
    const inputUtility = document.getElementById('input-utility-cost');
    const inputTransport = document.getElementById('input-transport-cost');
    const inputDepr = document.getElementById('input-depreciation-cost');
    const inputOverhead = document.getElementById('input-overhead-cost');

    if (inputLabor) inputLabor.value = ops.laborPerKg !== undefined ? ops.laborPerKg : 2000;
    if (inputUtility) inputUtility.value = ops.utilitiesPerKg !== undefined ? ops.utilitiesPerKg : 500;
    if (inputTransport) inputTransport.value = ops.transportPerKg !== undefined ? ops.transportPerKg : 500;
    if (inputDepr) inputDepr.value = ops.depreciationPerKg !== undefined ? ops.depreciationPerKg : 200;
    if (inputOverhead) inputOverhead.value = ops.overheadPerKg !== undefined ? ops.overheadPerKg : 300;

    // Qadoqlash
    const pack = recipe.packagingConfig || {};
    const selectPack = document.getElementById('select-packaging-type');
    const inputPackCost = document.getElementById('input-packaging-unit-cost');
    const inputLabelCost = document.getElementById('input-label-cost');

    if (selectPack) {
      if (pack.defaultType === 'bulk' || Number(pack.containerUnitCost) === 0) {
        selectPack.value = 'bulk';
      } else {
        const portion = pack.portionSizeKg || 0.5;
        if (portion === 0.25) selectPack.value = '250g';
        else if (portion === 0.5) selectPack.value = '500g';
        else if (portion === 1.0) {
          selectPack.value = (pack.defaultType === 'vacuum') ? 'vacuum' : '1000g';
        }
      }
    }

    const materialsMap = getRawMaterialsMap();
    const containerMat = materialsMap[pack.containerMaterialId];
    const defaultContainerCost = (pack.defaultType === 'bulk') ? 0 : (containerMat ? containerMat.pricePerUnit : 900);

    const labelMat = materialsMap[pack.labelMaterialId];
    const defaultLabelCost = (pack.defaultType === 'bulk') ? 0 : (labelMat ? labelMat.pricePerUnit : 200);

    if (inputPackCost) {
      inputPackCost.value = (pack.containerUnitCost !== undefined) ? pack.containerUnitCost : defaultContainerCost;
    }
    if (inputLabelCost) {
      inputLabelCost.value = (pack.labelUnitCost !== undefined) ? pack.labelUnitCost : defaultLabelCost;
    }
  }

  function renderKPIsAndSummary(calc) {
    // KPI Cards
    const totalCostEl = document.getElementById('metric-total-cost');
    const costKgEl = document.getElementById('metric-cost-per-kg');
    const costPackEl = document.getElementById('metric-cost-per-pack');
    const packSubtextEl = document.getElementById('metric-pack-subtext');
    const sellingPriceEl = document.getElementById('metric-selling-price');
    const sellingSubtextEl = document.getElementById('metric-selling-subtext');
    const totalProfitEl = document.getElementById('metric-total-profit');
    const marginPercentEl = document.getElementById('metric-margin-percent');

    // Operatsion va qadoqlash badgelari
    const packBadge = document.getElementById('badge-pack-total');
    const laborBadge = document.getElementById('badge-labor-total');
    const laborDisplay = document.getElementById('display-labor-cost');
    const overheadBadge = document.getElementById('badge-overhead-total');
    const packagesCountLabel = document.getElementById('label-packages-count');

    // Quyi foizli xulosa bloki
    const rawPctEl = document.getElementById('summary-raw-pct');
    const laborPctEl = document.getElementById('summary-labor-pct');
    const packPctEl = document.getElementById('summary-pack-pct');
    const otherPctEl = document.getElementById('summary-other-pct');
    const grandTotalEl = document.getElementById('summary-grand-total');

    // Xomashyolar jadvali ostidagi xulosa
    const bruttoWeightEl = document.getElementById('summary-brutto-weight');
    const rawCostEl = document.getElementById('summary-raw-cost');

    if (!calc) {
      if (totalCostEl) totalCostEl.textContent = "0 so'm";
      if (costKgEl) costKgEl.textContent = "0 so'm";
      if (costPackEl) costPackEl.textContent = "0 so'm";
      if (packSubtextEl) packSubtextEl.textContent = "Idishsiz (0 so'm)";
      if (sellingPriceEl) sellingPriceEl.textContent = "0 so'm";
      if (sellingSubtextEl) sellingSubtextEl.textContent = "1 kg uchun";
      if (totalProfitEl) totalProfitEl.textContent = "0 so'm";
      if (marginPercentEl) marginPercentEl.textContent = "0%";

      if (packBadge) packBadge.textContent = "0 so'm";
      if (packagesCountLabel) packagesCountLabel.textContent = "0 dona";
      if (laborBadge) laborBadge.textContent = "0 so'm";
      if (laborDisplay) laborDisplay.textContent = "0 so'm";
      if (overheadBadge) overheadBadge.textContent = "0 so'm";

      if (rawPctEl) rawPctEl.textContent = "0% (0 so'm)";
      if (laborPctEl) laborPctEl.textContent = "0% (0 so'm)";
      if (packPctEl) packPctEl.textContent = "0% (0 so'm)";
      if (otherPctEl) otherPctEl.textContent = "0% (0 so'm)";
      if (grandTotalEl) grandTotalEl.textContent = "0 so'm";

      if (bruttoWeightEl) bruttoWeightEl.textContent = "0 kg";
      if (rawCostEl) rawCostEl.textContent = "0 so'm";
      return;
    }

    if (totalCostEl) totalCostEl.textContent = formatMoney(calc.totalBatchCost);
    if (costKgEl) costKgEl.textContent = formatMoney(calc.costPerKg);
    if (costPackEl) {
      if (calc.packaging.isBulk || calc.costPerPortion === 0) {
        costPackEl.textContent = "0 so'm";
      } else {
        costPackEl.textContent = formatMoney(calc.costPerPortion);
      }
    }
    if (packSubtextEl) {
      if (calc.packaging.isBulk || calc.costPerPortion === 0) {
        packSubtextEl.textContent = "Qadoqsiz (Ulgurji / 0 so'm)";
      } else {
        const pSizeText = (calc.packaging.portionSizeKg >= 1) ? `${calc.packaging.portionSizeKg} kg` : `${calc.packaging.portionSizeKg * 1000}g`;
        packSubtextEl.textContent = `${pSizeText} idish (${calc.packaging.containersNeeded} dona)`;
      }
    }
    if (sellingPriceEl) sellingPriceEl.textContent = formatMoney(calc.recommendedSellingPricePerKg);
    if (sellingSubtextEl) {
      if (calc.packaging.isBulk || calc.costPerPortion === 0) {
        sellingSubtextEl.textContent = `1 kg uchun (Ulgurji / Qadoqsiz)`;
      } else {
        sellingSubtextEl.textContent = `1 kg uchun (1 idish: ${formatMoney(calc.recommendedSellingPricePerPortion)})`;
      }
    }
    if (totalProfitEl) totalProfitEl.textContent = formatMoney(calc.netProfitTotal);
    if (marginPercentEl) marginPercentEl.textContent = calc.profitabilityMarginPercent.toFixed(1) + "%";

    if (packBadge) packBadge.textContent = formatMoney(calc.packaging.packagingTotalCost);
    if (packagesCountLabel) {
      if (calc.packaging.isBulk || calc.packaging.containersNeeded === 0) {
        packagesCountLabel.textContent = "Idishsiz (0 dona)";
      } else {
        packagesCountLabel.textContent = `${calc.packaging.containersNeeded} dona`;
      }
    }
    if (laborBadge) laborBadge.textContent = formatMoney(calc.totalLaborCost);
    if (laborDisplay) laborDisplay.textContent = formatMoney(calc.totalLaborCost);
    if (overheadBadge) overheadBadge.textContent = formatMoney(calc.otherOperationalTotalCost);

    if (rawPctEl) rawPctEl.textContent = `${calc.costBreakdownPercent.rawMaterials}% (${formatMoney(calc.rawMaterialsTotalCost)})`;
    if (laborPctEl) laborPctEl.textContent = `${calc.costBreakdownPercent.labor}% (${formatMoney(calc.totalLaborCost)})`;
    if (packPctEl) packPctEl.textContent = `${calc.costBreakdownPercent.packaging}% (${formatMoney(calc.packaging.packagingTotalCost)})`;
    if (otherPctEl) otherPctEl.textContent = `${calc.costBreakdownPercent.other}% (${formatMoney(calc.otherOperationalTotalCost)})`;
    if (grandTotalEl) grandTotalEl.textContent = formatMoney(calc.totalBatchCost);

    if (bruttoWeightEl) bruttoWeightEl.textContent = `${calc.totalGrossWeight.toFixed(2)} kg`;
    if (rawCostEl) rawCostEl.textContent = formatMoney(calc.rawMaterialsTotalCost);
  }

  function renderIngredientsTable(calc) {
    const tbody = document.getElementById('recipe-ingredients-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!calc || !calc.ingredients || calc.ingredients.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="py-12 text-center text-slate-400">
            <i class="fa-solid fa-utensils text-2xl mb-2 text-slate-300 block"></i>
            Hozircha hech qanday salat yoki masalliq mavjud emas.<br>
            <span class="text-xs text-slate-500 font-medium">Boshlash uchun yuqoridagi <strong>"+ Yangi retsept"</strong> tugmasini bosing!</span>
          </td>
        </tr>
      `;
      return;
    }

    calc.ingredients.forEach((ing, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

      tr.innerHTML = `
        <td class="py-2.5 px-3 text-center text-xs font-semibold text-slate-400">${idx + 1}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-slate-800 text-xs sm:text-sm">${escapeHtml(ing.nameUz)}</div>
          ${ing.notes ? `<div class="text-[11px] text-slate-400 truncate max-w-xs">${escapeHtml(ing.notes)}</div>` : ''}
        </td>
        <td class="py-2.5 px-2 text-center text-xs text-slate-500 font-medium">${escapeHtml(ing.unit)}</td>
        <td class="py-2.5 px-2 text-right">
          <input type="number" step="0.01" min="0.001" value="${ing.netWeight}" 
            data-ing-idx="${idx}" data-field="netWeight"
            class="ing-input-edit w-20 px-2 py-1 text-right text-xs font-bold text-slate-800 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-primary-500">
        </td>
        <td class="py-2.5 px-2 text-center">
          <div class="flex items-center justify-center space-x-1">
            <input type="number" step="0.5" min="0" max="95" value="${ing.wastePercent}" 
              data-ing-idx="${idx}" data-field="wastePercent"
              class="ing-input-edit w-14 px-1 py-1 text-center text-xs font-semibold text-amber-700 border border-amber-200 rounded-lg bg-amber-50/50 focus:ring-1 focus:ring-amber-500">
            <span class="text-xs text-slate-400">%</span>
          </div>
        </td>
        <td class="py-2.5 px-2 text-right text-xs text-slate-600 whitespace-nowrap">
          ${formatMoney(ing.unitPrice)}
        </td>
        <td class="ing-cost-cell py-2.5 px-3 text-right text-xs font-extrabold text-primary-600 whitespace-nowrap">
          ${formatMoney(ing.cost)}
        </td>
        <td class="py-2.5 px-2 text-center">
          <button type="button" class="btn-delete-ingredient text-slate-300 hover:text-red-500 transition p-1" data-ing-idx="${idx}" title="O'chirish">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  function renderCalculationsUI(calc) {
    if (!calc) calc = updateActiveCalculations();
    if (!calc) return;

    renderKPIsAndSummary(calc);
    renderTexkarta();

    const grafikaTab = document.getElementById('tab-grafika');
    if (grafikaTab && grafikaTab.classList.contains('active')) {
      renderCharts(calc);
    }
  }

  // ==========================================================================
  // 6. XOMASHYOLAR BAZASI JADVALI (TAB 2)
  // ==========================================================================

  function renderMaterialsTable() {
    const tbody = document.getElementById('materials-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    const filterCat = State.materialsFilter || 'all';
    const search = (State.materialsSearch || '').trim().toLowerCase();

    // Qaysi xomashyo retseptlarda ishlatilayotganini aniqlash
    const usedMaterialsMap = {};
    State.recipes.forEach(r => {
      (r.ingredients || []).forEach(ing => {
        usedMaterialsMap[ing.materialId] = (usedMaterialsMap[ing.materialId] || 0) + 1;
      });
      if (r.packagingConfig) {
        if (r.packagingConfig.containerMaterialId) usedMaterialsMap[r.packagingConfig.containerMaterialId] = 1;
        if (r.packagingConfig.labelMaterialId) usedMaterialsMap[r.packagingConfig.labelMaterialId] = 1;
      }
    });

    const filtered = State.materials.filter(m => {
      if (filterCat !== 'all' && m.category !== filterCat) return false;
      if (search) {
        const uz = (m.nameUz || '').toLowerCase();
        const ru = (m.nameRu || '').toLowerCase();
        return uz.includes(search) || ru.includes(search);
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="py-12 text-center text-slate-400">
            <i class="fa-solid fa-boxes-stacked text-2xl mb-2 text-slate-300 block"></i>
            Xomashyo bazasi butunlay toza.<br>
            <span class="text-xs text-slate-500 font-medium">O'zingizning masalliqlaringizni kiritish uchun <strong>"+ Yangi xomashyo"</strong> tugmasini bosing!</span>
          </td>
        </tr>
      `;
      return;
    }

    const categoryNames = {
      vegetables: "Sabzavot va ko'kat",
      spices_sauces: "Ziravor va sous",
      dry_goods: "Quruq / Kraxmal",
      packaging: "Qadoqlash va tara"
    };

    filtered.forEach((mat, idx) => {
      const isUsed = Boolean(usedMaterialsMap[mat.id]);
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

      tr.innerHTML = `
        <td class="py-3 px-3 text-center text-xs font-semibold text-slate-400">${idx + 1}</td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-900 text-xs sm:text-sm">${escapeHtml(mat.nameUz)}</div>
          ${mat.nameRu ? `<div class="text-[11px] text-slate-400">${escapeHtml(mat.nameRu)}</div>` : ''}
        </td>
        <td class="py-3 px-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
            ${categoryNames[mat.category] || mat.category}
          </span>
        </td>
        <td class="py-3 px-3 text-center text-xs font-semibold text-slate-600">${escapeHtml(mat.unit)}</td>
        <td class="py-3 px-3 text-right">
          <div class="inline-flex items-center space-x-1 justify-end">
            <input type="number" step="100" min="0" value="${mat.pricePerUnit}" 
              data-mat-id="${mat.id}"
              class="mat-price-inline-input w-28 px-2 py-1 text-right text-xs font-bold text-slate-900 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-500">
            <span class="text-xs text-slate-500">so'm</span>
          </div>
        </td>
        <td class="py-3 px-3 text-center text-xs font-semibold text-amber-700">
          ${mat.defaultWastePercent || 0}%
        </td>
        <td class="py-3 px-3 text-center">
          ${isUsed 
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800"><i class="fa-solid fa-check text-[9px] mr-1"></i>Ishlatilmoqda</span>` 
            : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">Erkin</span>`}
        </td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center space-x-2">
            <button type="button" class="btn-edit-material text-slate-400 hover:text-primary-600 transition" data-mat-id="${mat.id}" title="Tahrirlash">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="btn-delete-material text-slate-400 hover:text-red-500 transition" data-mat-id="${mat.id}" title="O'chirish">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  // ==========================================================================
  // 7. CHART.JS INTEGRATSIYASI VA GRAFIKLAR (TAB 3)
  // ==========================================================================

  function renderCharts(calc) {
    if (!calc || typeof Chart === 'undefined') return;

    // 1. Tannarx tuzilishi aylana diagrammasi (Donut Chart)
    const ctxBreakdown = document.getElementById('chart-cost-breakdown');
    if (ctxBreakdown) {
      if (State.charts.breakdown) {
        State.charts.breakdown.destroy();
      }

      State.charts.breakdown = new Chart(ctxBreakdown, {
        type: 'doughnut',
        data: {
          labels: [
            "Xomashyo sarfi",
            "Ish haqi (Mehnat)",
            "Qadoqlash (Tara/nakleyka)",
            "Kommunal va boshqalar"
          ],
          datasets: [{
            data: [
              calc.rawMaterialsTotalCost,
              calc.totalLaborCost,
              calc.packaging.packagingTotalCost,
              calc.otherOperationalTotalCost
            ],
            backgroundColor: [
              '#3b82f6', // Xomashyo - moviy
              '#f59e0b', // Ish haqi - to'q sariq
              '#a855f7', // Qadoqlash - binafsha
              '#06b6d4'  // Kommunal - moviy/cyan
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { size: 11, family: 'Inter' }
              }
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const val = context.raw || 0;
                  const total = calc.totalBatchCost || 1;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${context.label}: ${formatMoney(val)} (${pct}%)`;
                }
              }
            }
          },
          cutout: '65%'
        }
      });
    }

    // 2. Eng qimmat xomashyolar (Top Ingredients Bar Chart)
    const ctxTop = document.getElementById('chart-top-ingredients');
    if (ctxTop) {
      if (State.charts.topIngredients) {
        State.charts.topIngredients.destroy();
      }

      const sortedIngs = [...calc.ingredients].sort((a, b) => b.cost - a.cost).slice(0, 6);
      const labels = sortedIngs.map(i => i.nameUz.length > 18 ? i.nameUz.substring(0, 16) + '...' : i.nameUz);
      const dataCosts = sortedIngs.map(i => i.cost);

      State.charts.topIngredients = new Chart(ctxTop, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: "Xarajat (so'm)",
            data: dataCosts,
            backgroundColor: '#f59e0b',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return ` Xarajat: ${formatMoney(ctx.raw)}`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: {
                callback: function (val) {
                  return val >= 1000 ? (val / 1000) + 'k' : val;
                },
                font: { size: 10 }
              },
              grid: { color: '#f1f5f9' }
            },
            y: {
              ticks: { font: { size: 11 } },
              grid: { display: false }
            }
          }
        }
      });
    }

    // 3. Salatlarni taqqoslash grafigi va jadvali
    renderSaladsComparison();
  }

  function renderSaladsComparison() {
    const ctxComp = document.getElementById('chart-salads-comparison');
    const tbody = document.getElementById('salads-comparison-table-body');
    if (!ctxComp || typeof Chart === 'undefined') return;

    const labels = [];
    const costsPerKg = [];
    const sellingPricesPerKg = [];
    const tableRows = [];

    State.recipes.forEach(r => {
      // 10 kg partiya bo'yicha hisoblaymiz
      const c = calculateRecipe(r, 10.0, State.markupPercent);
      if (!c) return;

      labels.push(r.nameUz);
      costsPerKg.push(c.costPerKg);
      sellingPricesPerKg.push(c.recommendedSellingPricePerKg);

      tableRows.push({
        id: r.id,
        name: r.nameUz,
        category: r.category,
        costPerKg: c.costPerKg,
        sellingPricePerKg: c.recommendedSellingPricePerKg,
        profitPerKg: c.netProfitPerKg,
        margin: c.profitabilityMarginPercent
      });
    });

    if (State.charts.comparison) {
      State.charts.comparison.destroy();
    }

    State.charts.comparison = new Chart(ctxComp, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: "1 kg Tannarxi (so'm)",
            data: costsPerKg,
            backgroundColor: '#3b82f6',
            borderRadius: 6
          },
          {
            label: "Tavsiya Sotish Narxi (so'm)",
            data: sellingPricesPerKg,
            backgroundColor: '#10b981',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function (val) {
                return (val / 1000) + ' ming';
              },
              font: { size: 10 }
            },
            grid: { color: '#f1f5f9' }
          },
          x: {
            ticks: { font: { size: 11 } },
            grid: { display: false }
          }
        }
      }
    });

    // Qiyosiy jadvalni to'ldirish
    if (tbody) {
      tbody.innerHTML = '';
      tableRows.forEach(item => {
        let recommendationBadge = `<span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-800">Yuqori rentabellik</span>`;
        if (item.margin < 25) {
          recommendationBadge = `<span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700">Standart</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';
        tr.innerHTML = `
          <td class="py-2.5 px-4 font-bold text-slate-900">${escapeHtml(item.name)}</td>
          <td class="py-2.5 px-3 text-right font-semibold text-slate-700">${formatMoney(item.costPerKg)}</td>
          <td class="py-2.5 px-3 text-right font-extrabold text-emerald-700">${formatMoney(item.sellingPricePerKg)}</td>
          <td class="py-2.5 px-3 text-right font-bold text-emerald-600">+${formatMoney(item.profitPerKg)}</td>
          <td class="py-2.5 px-3 text-center font-bold text-slate-800">${item.margin.toFixed(1)}%</td>
          <td class="py-2.5 px-3 text-center">${recommendationBadge}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // ==========================================================================
  // 8. TEXNOLOGIK VA KALKULYATSIYA XARITASI (TAB 4 - TEXKARTA)
  // ==========================================================================

  function renderTexkarta() {
    const calc = State.currentCalculations;
    const prodNameEl = document.getElementById('texkarta-product-name');
    const tbody = document.getElementById('texkarta-ingredients-body');
    const instructionsEl = document.getElementById('texkarta-instructions-text');

    if (!calc) {
      if (prodNameEl) prodNameEl.textContent = "Retsept tanlanmagan";
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">Hozircha hech qanday salat retsepti mavjud emas</td></tr>`;
      }
      if (instructionsEl) instructionsEl.textContent = "Retsept mavjud emas.";
      return;
    }

    // Pasport
    const docIdEl = document.getElementById('texkarta-doc-id');
    const dateEl = document.getElementById('texkarta-date');
    const batchWeightEl = document.getElementById('texkarta-batch-weight');
    const portionSizeEl = document.getElementById('texkarta-portion-size');

    if (docIdEl) docIdEl.textContent = calc.recipeCode || 'TK-01';
    if (dateEl) {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      dateEl.textContent = `${dd}.${mm}.${yyyy}`;
    }
    if (prodNameEl) prodNameEl.textContent = calc.recipeNameUz;
    if (batchWeightEl) batchWeightEl.textContent = `${calc.targetBatchKg} kg`;
    if (portionSizeEl) {
      const pSize = (calc.packaging.portionSizeKg >= 1) ? `${calc.packaging.portionSizeKg} kg` : `${calc.packaging.portionSizeKg * 1000} gr`;
      portionSizeEl.textContent = `${pSize} (${calc.packaging.containersNeeded} dona)`;
    }

    // 1-Jadval: Xomashyo sarfi
    if (tbody) {
      tbody.innerHTML = '';
      calc.ingredients.forEach((ing, i) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-300';
        tr.innerHTML = `
          <td class="p-1.5 text-center">${i + 1}</td>
          <td class="p-1.5 font-medium">${escapeHtml(ing.nameUz)}</td>
          <td class="p-1.5 text-center">${escapeHtml(ing.unit)}</td>
          <td class="p-1.5 text-right">${ing.netWeight.toFixed(3)}</td>
          <td class="p-1.5 text-center">${ing.wastePercent}%</td>
          <td class="p-1.5 text-right font-semibold">${ing.grossWeight.toFixed(3)}</td>
          <td class="p-1.5 text-right">${formatMoney(ing.unitPrice)}</td>
          <td class="p-1.5 text-right font-bold">${formatMoney(ing.cost)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    const totalBruttoEl = document.getElementById('texkarta-total-brutto');
    const totalRawCostEl = document.getElementById('texkarta-total-raw-cost');
    if (totalBruttoEl) totalBruttoEl.textContent = `${calc.totalGrossWeight.toFixed(3)} kg`;
    if (totalRawCostEl) totalRawCostEl.textContent = formatMoney(calc.rawMaterialsTotalCost);

    // 2-Jadval: Operatsion xarajatlar
    const laborCostEl = document.getElementById('texkarta-labor-cost');
    const packCostEl = document.getElementById('texkarta-pack-cost');
    const utilityCostEl = document.getElementById('texkarta-utility-cost');
    const otherCostEl = document.getElementById('texkarta-other-cost');
    const extraTotalEl = document.getElementById('texkarta-extra-total');

    if (laborCostEl) laborCostEl.textContent = formatMoney(calc.totalLaborCost);
    if (packCostEl) packCostEl.textContent = formatMoney(calc.packaging.packagingTotalCost);
    if (utilityCostEl) utilityCostEl.textContent = formatMoney(calc.totalUtilitiesCost);
    if (otherCostEl) otherCostEl.textContent = formatMoney(calc.totalTransportCost + calc.totalDepreciationCost + (calc.totalOverheadCost || 0));
    if (extraTotalEl) extraTotalEl.textContent = formatMoney(calc.operationalTotalCost + calc.packaging.packagingTotalCost);

    // 3-Jadval: Iqtisodiy ko'rsatkichlar
    const grandTotalEl = document.getElementById('texkarta-grand-total');
    const kgCostEl = document.getElementById('texkarta-kg-cost');
    const packUnitCostEl = document.getElementById('texkarta-pack-unit-cost');
    const sellingKgEl = document.getElementById('texkarta-selling-kg');
    const marginPctEl = document.getElementById('texkarta-margin-pct');

    if (grandTotalEl) grandTotalEl.textContent = formatMoney(calc.totalBatchCost);
    if (kgCostEl) kgCostEl.textContent = formatMoney(calc.costPerKg);
    if (packUnitCostEl) packUnitCostEl.textContent = formatMoney(calc.costPerPortion);
    if (sellingKgEl) sellingKgEl.textContent = formatMoney(calc.recommendedSellingPricePerKg);
    if (marginPctEl) marginPctEl.textContent = `${calc.profitabilityMarginPercent.toFixed(1)}% (Ustama: ${calc.markupPercent}%)`;

    // 4. Tayyorlash texnologiyasi matni
    if (instructionsEl) {
      const active = getActiveRecipe();
      instructionsEl.textContent = (active && (active.instructions || active.descriptionUz)) 
        ? (active.instructions || active.descriptionUz) 
        : "Sanitariya qoidalariga rioya qilingan holda xomashyolar yuviladi, tozalanadi, belgilangan me'yorlarda aralashtiriladi va qadoqlanadi.";
    }
  }

  // ==========================================================================
  // 9. TOAST XABARNOMALARI VA MODALLAR
  // ==========================================================================

  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast flex items-center px-4 py-3 rounded-xl shadow-lg border text-xs sm:text-sm font-semibold max-w-sm';

    let icon = '<i class="fa-solid fa-circle-check text-emerald-500 mr-2.5 text-base"></i>';
    let bgBorder = 'bg-white border-emerald-200 text-slate-800';

    if (type === 'info') {
      icon = '<i class="fa-solid fa-circle-info text-blue-500 mr-2.5 text-base"></i>';
      bgBorder = 'bg-white border-blue-200 text-slate-800';
    } else if (type === 'warning') {
      icon = '<i class="fa-solid fa-triangle-exclamation text-amber-500 mr-2.5 text-base"></i>';
      bgBorder = 'bg-white border-amber-200 text-slate-800';
    } else if (type === 'error') {
      icon = '<i class="fa-solid fa-circle-xmark text-red-500 mr-2.5 text-base"></i>';
      bgBorder = 'bg-white border-red-200 text-slate-800';
    }

    toast.className += ` ${bgBorder}`;
    toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.remove('hidden');
    }
  }

  function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.add('hidden');
    }
  }

  function confirmDialog(title, message, onOk) {
    const modal = document.getElementById('modal-confirm');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    State.confirmCallback = onOk;
    openModal('modal-confirm');
  }

  // ==========================================================================
  // 10. RETSEPT KONSTRUKTORI (RECIPE BUILDER MODAL 5)
  // ==========================================================================

  const RecipeBuilder = {
    open(recipeId = null) {
      const modal = document.getElementById('modal-recipe-builder');
      if (!modal) return;

      const titleEl = document.getElementById('recipe-builder-title');
      const matSelect = document.getElementById('rb-add-material-select');

      // 1. Xomashyo tanlash selectini to'ldirish
      if (matSelect) {
        matSelect.innerHTML = '';
        State.materials.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = `${m.nameUz} (${m.unit || 'kg'} - ${formatMoney(m.pricePerUnit)})`;
          matSelect.appendChild(opt);
        });

        // Birinchi element chiqindisini qo'yish
        const first = State.materials[0];
        const wasteInput = document.getElementById('rb-add-waste-input');
        if (first && wasteInput) {
          wasteInput.value = first.defaultWastePercent || 0;
        }
      }

      // 2. Tahrirlash yoki yangi yaratish holati
      if (recipeId) {
        const recipe = State.recipes.find(r => r.id === recipeId) || getActiveRecipe();
        if (recipe) {
          if (titleEl) titleEl.textContent = `Retseptni Tahrirlash: ${recipe.nameUz}`;
          document.getElementById('rb-recipe-id').value = recipe.id;
          document.getElementById('rb-name').value = recipe.nameUz || '';
          document.getElementById('rb-name-ru').value = recipe.nameRu || '';
          document.getElementById('rb-category').value = recipe.category || 'Sabzavotli';
          document.getElementById('rb-batch-weight').value = recipe.batchOutputKg || 10;
          document.getElementById('rb-markup').value = recipe.defaultMarkupPercent !== undefined ? recipe.defaultMarkupPercent : 40;
          document.getElementById('rb-shelf-life').value = recipe.shelfLifeDays || 10;
          document.getElementById('rb-description').value = recipe.descriptionUz || '';
          document.getElementById('rb-instructions').value = recipe.instructions || recipe.descriptionUz || '';

          const ops = recipe.operationalCosts || {};
          document.getElementById('rb-labor-cost').value = ops.laborPerKg !== undefined ? ops.laborPerKg : 2000;
          document.getElementById('rb-utilities-cost').value = ops.utilitiesPerKg !== undefined ? ops.utilitiesPerKg : 500;
          document.getElementById('rb-transport-cost').value = ops.transportPerKg !== undefined ? ops.transportPerKg : 500;
          const combinedOverhead = (ops.overheadPerKg !== undefined || ops.depreciationPerKg !== undefined)
            ? (Number(ops.overheadPerKg || 0) + Number(ops.depreciationPerKg || 0))
            : 500;
          document.getElementById('rb-overhead-cost').value = combinedOverhead;

          // Masalliqlarni nusxalash
          RecipeBuilderState.ingredients = (recipe.ingredients || []).map(ing => Object.assign({}, ing));
        }
      } else {
        // Yangi yaratish
        if (titleEl) titleEl.textContent = "Yangi Salat Retseptini Yaratish";
        document.getElementById('rb-recipe-id').value = '';
        document.getElementById('rb-name').value = '';
        document.getElementById('rb-name-ru').value = '';
        document.getElementById('rb-category').value = 'Sabzavotli';
        document.getElementById('rb-batch-weight').value = '10';
        document.getElementById('rb-markup').value = '40';
        document.getElementById('rb-shelf-life').value = '10';
        document.getElementById('rb-description').value = '';
        document.getElementById('rb-instructions').value = '';

        document.getElementById('rb-labor-cost').value = '2000';
        document.getElementById('rb-utilities-cost').value = '500';
        document.getElementById('rb-transport-cost').value = '500';
        document.getElementById('rb-overhead-cost').value = '500';

        RecipeBuilderState.ingredients = [];
      }

      document.getElementById('rb-add-netto-input').value = '';
      this.renderIngredientsTable();
      openModal('modal-recipe-builder');
    },

    renderIngredientsTable() {
      const tbody = document.getElementById('rb-ingredients-tbody');
      const footerBrutto = document.getElementById('rb-footer-brutto');
      const footerCost = document.getElementById('rb-footer-total-cost');
      if (!tbody) return;

      tbody.innerHTML = '';
      const materialsMap = getRawMaterialsMap();

      let totalGross = 0;
      let totalCost = 0;

      if (RecipeBuilderState.ingredients.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="py-6 text-center text-slate-400 italic">
              Masalliqlar yo'q. Yuqoridagi panel orqali xomashyo qo'shing.
            </td>
          </tr>
        `;
        if (footerBrutto) footerBrutto.textContent = '0 kg';
        if (footerCost) footerCost.textContent = '0 so\'m';
        return;
      }

      RecipeBuilderState.ingredients.forEach((ing, idx) => {
        const mat = materialsMap[ing.materialId];
        const unitPrice = mat ? mat.pricePerUnit : (ing.unitPrice || 0);
        const wp = Math.max(0, Math.min(99.9, Number(ing.wastePercent) || 0));
        const net = Number(ing.netWeight) || 0;
        const gross = Number((net / (1 - wp / 100)).toFixed(4));
        ing.grossWeight = gross;
        ing.unitPrice = unitPrice;

        const rawUnit = (ing.unit || (mat && mat.unit) || 'kg').toLowerCase().trim();
        const isGram = (rawUnit === 'gr' || rawUnit === 'g' || rawUnit === 'gram' || rawUnit === 'gramm');
        const effectiveGrossKg = isGram ? (gross / 1000) : gross;
        const cost = Math.round(effectiveGrossKg * unitPrice);
        totalGross += effectiveGrossKg;
        totalCost += cost;

        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition';
        tr.innerHTML = `
          <td class="py-2 px-3 font-bold text-slate-800">${escapeHtml(ing.nameUz || (mat && mat.nameUz) || '')}</td>
          <td class="py-2 px-2 text-center text-slate-500">${escapeHtml(ing.unit || (mat && mat.unit) || 'kg')}</td>
          <td class="py-2 px-2 text-right">
            <input type="number" step="0.01" min="0.001" value="${net}" data-idx="${idx}" data-field="netWeight" class="rb-inline-input w-20 px-1.5 py-0.5 text-right font-bold text-slate-800 border rounded">
          </td>
          <td class="py-2 px-2 text-center">
            <input type="number" step="0.5" min="0" max="95" value="${wp}" data-idx="${idx}" data-field="wastePercent" class="rb-inline-input w-14 px-1 py-0.5 text-center font-semibold text-amber-700 border rounded">
          </td>
          <td class="py-2 px-2 text-right font-semibold text-slate-700">${gross.toFixed(3)}</td>
          <td class="py-2 px-2 text-right text-slate-600">${formatMoney(unitPrice)}</td>
          <td class="py-2 px-2 text-right font-bold text-primary-600">${formatMoney(cost)}</td>
          <td class="py-2 px-2 text-center">
            <button type="button" class="btn-rb-del-ing text-slate-300 hover:text-red-500 transition" data-idx="${idx}">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      if (footerBrutto) footerBrutto.textContent = `${totalGross.toFixed(2)} kg`;
      if (footerCost) footerCost.textContent = formatMoney(totalCost);
    },

    addIngredient() {
      const matSelect = document.getElementById('rb-add-material-select');
      const nettoInput = document.getElementById('rb-add-netto-input');
      const wasteInput = document.getElementById('rb-add-waste-input');

      if (!matSelect || !nettoInput) return;

      const matId = matSelect.value;
      const netto = parseNumberInput(nettoInput.value, NaN);
      const waste = parseNumberInput(wasteInput ? wasteInput.value : 0, 0);

      if (isNaN(netto) || netto <= 0) {
        showToast("Netto miqdorini to'g'ri kiriting!", "warning");
        return;
      }

      const mat = State.materials.find(m => m.id === matId);
      if (!mat) {
        showToast("Xomashyoni tanlang yoki '+ Yangi xomashyo' tugmasi orqali yangi xomashyo kiriting!", "warning");
        return;
      }

      const wp = Math.max(0, Math.min(99.9, waste));
      const gross = Number((netto / (1 - wp / 100)).toFixed(4));

      RecipeBuilderState.ingredients.push({
        materialId: mat.id,
        nameUz: mat.nameUz,
        nameRu: mat.nameRu || '',
        unit: mat.unit || 'kg',
        unitPrice: mat.pricePerUnit || 0,
        netWeight: netto,
        wastePercent: wp,
        grossWeight: gross,
        notes: ""
      });

      nettoInput.value = '';
      this.renderIngredientsTable();
      showToast(`"${mat.nameUz}" masalliqlarga qo'shildi!`, "info");
    },

    save() {
      const id = document.getElementById('rb-recipe-id').value;
      const nameUz = document.getElementById('rb-name').value.trim();
      const nameRu = document.getElementById('rb-name-ru').value.trim();
      const category = document.getElementById('rb-category').value;
      const batchWeight = parseFloat(document.getElementById('rb-batch-weight').value) || 10.0;
      const markup = parseFloat(document.getElementById('rb-markup').value) || 40.0;
      const shelfLife = parseInt(document.getElementById('rb-shelf-life').value, 10) || 10;
      const description = document.getElementById('rb-description').value.trim();
      const instructions = document.getElementById('rb-instructions').value.trim();

      const labor = parseFloat(document.getElementById('rb-labor-cost').value) || 2000;
      const utilities = parseFloat(document.getElementById('rb-utilities-cost').value) || 500;
      const transport = parseFloat(document.getElementById('rb-transport-cost').value) || 500;
      const overhead = parseFloat(document.getElementById('rb-overhead-cost').value) || 300;

      if (!nameUz) {
        showToast("Salat nomini kiriting!", "warning");
        return;
      }

      if (RecipeBuilderState.ingredients.length === 0) {
        showToast("Kamida bitta masalliq qo'shing!", "warning");
        return;
      }

      const materialsMap = getRawMaterialsMap();
      const finalIngredients = RecipeBuilderState.ingredients.map(ing => {
        const mat = materialsMap[ing.materialId];
        return {
          materialId: ing.materialId,
          nameUz: ing.nameUz || (mat && mat.nameUz) || "Masalliq",
          nameRu: ing.nameRu || (mat && mat.nameRu) || "",
          unit: ing.unit || (mat && mat.unit) || 'kg',
          unitPrice: mat ? mat.pricePerUnit : (ing.unitPrice || 0),
          netWeight: Number(ing.netWeight) || 0,
          wastePercent: Number(ing.wastePercent) || 0,
          grossWeight: Number(ing.grossWeight) || 0,
          notes: ing.notes || ""
        };
      });

      if (id) {
        // Mavjud retseptni yangilash
        const recipe = State.recipes.find(r => r.id === id);
        if (recipe) {
          recipe.nameUz = nameUz;
          recipe.nameRu = nameRu;
          recipe.category = category;
          recipe.batchOutputKg = batchWeight;
          recipe.defaultMarkupPercent = markup;
          recipe.shelfLifeDays = shelfLife;
          recipe.descriptionUz = description;
          recipe.instructions = instructions;
          recipe.ingredients = finalIngredients;
          recipe.operationalCosts = {
            laborPerKg: labor,
            utilitiesPerKg: utilities,
            transportPerKg: transport,
            depreciationPerKg: Math.round(overhead * 0.4),
            overheadPerKg: Math.round(overhead * 0.6)
          };
          showToast(`"${nameUz}" retsepti to'liq yangilandi!`, "success");
        }
      } else {
        // Yangi retsept yaratish
        const newId = 'recipe_custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const newRecipe = {
          id: newId,
          code: 'REC-' + (State.recipes.length + 1).toString().padStart(2, '0'),
          nameUz: nameUz,
          nameRu: nameRu,
          category: category,
          batchOutputKg: batchWeight,
          defaultMarkupPercent: markup,
          shelfLifeDays: shelfLife,
          descriptionUz: description,
          instructions: instructions,
          ingredients: finalIngredients,
          operationalCosts: {
            laborPerKg: labor,
            utilitiesPerKg: utilities,
            transportPerKg: transport,
            depreciationPerKg: Math.round(overhead * 0.4),
            overheadPerKg: Math.round(overhead * 0.6)
          },
          packagingConfig: {
            portionSizeKg: 0.50,
            defaultType: 'container_500g',
            containerMaterialId: 'mat_pack_500g',
            containerUnitCost: 900,
            labelUnitCost: 200,
            includeLabel: true
          }
        };

        State.recipes.push(newRecipe);
        State.activeRecipeId = newId;
        showToast(`Yangi retsept "${nameUz}" muvaffaqiyatli saqlandi!`, "success");
      }

      State.batchKg = batchWeight;
      State.markupPercent = markup;
      saveState();
      closeModal('modal-recipe-builder');

      renderRecipeDropdown();
      renderActiveRecipeMetaInputs();
      const calc = updateActiveCalculations();
      renderIngredientsTable(calc);
      renderCalculationsUI(calc);
    }
  };

  // ==========================================================================
  // 11. LOKAL AI AGENT (SALAT AI TEXNOLOGI)
  // ==========================================================================

  const SalatAIAgent = {
    geminiApiKey: '',

    init() {
      this.geminiApiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY) || '';
      const keyInput = document.getElementById('input-gemini-api-key');
      if (keyInput && this.geminiApiKey) {
        keyInput.value = this.geminiApiKey;
      }
    },

    toggleDrawer(show) {
      const drawer = document.getElementById('ai-chat-drawer');
      if (!drawer) return;
      if (show === undefined) {
        drawer.classList.toggle('hidden-drawer');
      } else if (show) {
        drawer.classList.remove('hidden-drawer');
      } else {
        drawer.classList.add('hidden-drawer');
      }
    },

    appendMessage(content, sender = 'bot', recipeTemplate = null) {
      const container = document.getElementById('ai-chat-messages');
      if (!container) return;

      const div = document.createElement('div');
      div.className = 'flex items-start space-x-2.5';

      if (sender === 'user') {
        div.className += ' justify-end';
        div.innerHTML = `
          <div class="ai-bubble-user p-3 rounded-2xl max-w-[85%] bg-primary-600 text-white font-medium text-xs leading-relaxed shadow-xs">
            ${escapeHtml(content)}
          </div>
        `;
      } else {
        let recipeCardHtml = '';
        if (recipeTemplate) {
          recipeCardHtml = `
            <div class="ai-recipe-card mt-3 p-3 rounded-2xl bg-white border border-emerald-300 shadow-sm">
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-bold text-slate-900 text-xs flex items-center">
                  <i class="fa-solid fa-mortar-pestle text-emerald-600 mr-1.5"></i>
                  ${escapeHtml(recipeTemplate.nameUz)}
                </span>
                <span class="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  ${escapeHtml(recipeTemplate.category || 'Retsept')}
                </span>
              </div>
              <p class="text-[11px] text-slate-600 mb-2 leading-tight">
                ${escapeHtml(recipeTemplate.descriptionUz || recipeTemplate.instructions || '')}
              </p>
              <div class="text-[10px] text-slate-500 mb-2.5 font-medium flex items-center justify-between">
                <span>Chiqish: <strong>${recipeTemplate.batchOutputKg} kg</strong></span>
                <span>Masalliqlar: <strong>${(recipeTemplate.ingredients || []).length} xil</strong></span>
              </div>
              <button type="button" class="btn-ai-apply-recipe w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center" data-recipe-id="${recipeTemplate.id}">
                <i class="fa-solid fa-plus-circle mr-1.5"></i> Ilovaga qo'shish va hisoblash
              </button>
            </div>
          `;
        }

        // Matnni chiroyli formatlash (Markdown -> HTML)
        const formattedText = content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n/g, '<br>');

        div.innerHTML = `
          <div class="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs flex-shrink-0 shadow-xs">
            🤖
          </div>
          <div class="ai-bubble-bot p-3.5 rounded-2xl max-w-[85%] text-slate-800 leading-relaxed shadow-xs">
            <div>${formattedText}</div>
            ${recipeCardHtml}
          </div>
        `;
      }

      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    },

    showTyping(show = true) {
      const indicator = document.getElementById('ai-typing-indicator');
      if (indicator) {
        if (show) indicator.classList.remove('hidden');
        else indicator.classList.add('hidden');
      }
    },

    async handleUserQuery(query) {
      if (!query || !query.trim()) return;
      const text = query.trim();

      // 1. Foydalanuvchi xabarini chiqarish
      this.appendMessage(text, 'user');
      this.showTyping(true);

      // Agar Gemini API kaliti mavjud bo'lsa, avval uni sinab ko'ramiz
      let answered = false;
      if (this.geminiApiKey) {
        try {
          const geminiAnswer = await this.askGemini(text);
          if (geminiAnswer) {
            this.showTyping(false);
            // Matn ichida retsept shabloni bormi tekshiramiz
            const matchedTemplate = this.findMatchingTemplate(text);
            this.appendMessage(geminiAnswer, 'bot', matchedTemplate);
            answered = true;
          }
        } catch (e) {
          console.warn("Gemini API xatoligi, lokal Offline AI ga o'tilmoqda:", e);
        }
      }

      if (!answered) {
        // 2. Lokal 100% Offline AI dvigateli
        setTimeout(() => {
          this.showTyping(false);
          const response = this.localEngine(text);
          this.appendMessage(response.text, 'bot', response.template);
        }, 350);
      }
    },

    localEngine(query) {
      const q = query.toLowerCase();
      const catalog = getCatalog();
      const kb = catalog ? catalog.AI_KNOWLEDGE_BASE : null;

      if (!kb) {
        return {
          text: "Koreys salatlari bo'yicha maslahatlar bazasi yuklanmadi.",
          template: null
        };
      }

      // 1. Retsept generatsiyasi va shablonlar (Qo'ziqorin, Kamdi-cha, He, Bodring-cha)
      const matchedTemplate = this.findMatchingTemplate(query);
      if (matchedTemplate) {
        const ingredientsList = (matchedTemplate.ingredients || [])
          .slice(0, 7)
          .map(i => `• ${i.nameUz}: ${i.grossWeight} ${i.unit}`)
          .join('\n');

        return {
          text: `Salom! Siz so'ragan **${matchedTemplate.nameUz}** uchun professional texnologik xarita va standart retseptura tayyorladim.\n\n` +
                `**Partiya chiqishi**: ${matchedTemplate.batchOutputKg} kg\n` +
                `**Asosiy masalliqlar me'yori**:\n${ingredientsList}\n\n` +
                `**Texnologik sir**: ${matchedTemplate.descriptionUz || matchedTemplate.instructions}\n\n` +
                `Quyidagi tugma orqali ushbu retseptni **to'g'ridan-to'g'ri kalkulyatorga yuklab**, tannarxini hisoblashingiz mumkin:`,
          template: matchedTemplate
        };
      }

      // 2. Muammolarni bartaraf etish (Troubleshooting)
      for (const p of (kb.troubleshooting || [])) {
        const pid = p.id || '';
        if (
          ((pid === 'problem_water' || pid.includes('water')) && (q.includes('suv') || q.includes('oqib') || q.includes('suyuq') || q.includes('suvlan'))) ||
          ((pid === 'problem_sour_spoil' || pid.includes('sour')) && (q.includes('achi') || q.includes('aynish') || q.includes('buzil') || q.includes('gazlan'))) ||
          ((pid === 'problem_soft_carrot' || pid.includes('soft')) && (q.includes('yumsh') || q.includes('qarsildoq') || q.includes('shirillash'))) ||
          ((pid === 'problem_too_salty' || pid.includes('salty')) && (q.includes('sho\'r') || q.includes('shor') || q.includes('tuzli'))) ||
          ((pid === 'problem_too_spicy' || pid.includes('spicy')) && (q.includes('achchiq') || q.includes('kuyish') || q.includes('qalampir')))
        ) {
          return {
            text: `⚠️ **Muammo**: ${p.problemUz}\n\n` +
                  `🔍 **Asosiy sababi**: ${p.causeUz}\n\n` +
                  `🛠️ **Texnologik yechim**:\n${p.solutionUz}`,
            template: null
          };
        }
      }

      // 3. Salatlar texnologiyalari (Morkovcha, Funchoza, Kimchi, Baqlajon, Fuju, Bodringcha)
      for (const t of (kb.technologies || [])) {
        const tid = (t.id || '').replace(/^tech_/, '');
        if (
          (tid === 'morkovcha' && (q.includes('sabzi') || q.includes('morkov'))) ||
          (tid === 'funchoza' && q.includes('funchoz')) ||
          (tid === 'kimchi' && (q.includes('kimchi') || q.includes('chimchi') || q.includes('pekin'))) ||
          (tid === 'baqlajon' && q.includes('baqlajon')) ||
          (tid === 'fuju' && (q.includes('fuju') || q.includes('spargel') || q.includes('fuchju'))) ||
          (tid === 'bodringcha' && (q.includes('bodring') || q.includes('vechat')))
        ) {
          const secretsList = Array.isArray(t.secrets) ? t.secrets.map(s => `• ${s}`).join('\n') : (t.secretUz ? `• ${t.secretUz}` : '');
          const wasteInfo = t.wastePercentRange ? `\n• **Chiqindi me'yori**: ${t.wastePercentRange}` : '';
          const storageInfo = t.idealStorage ? `\n• **Saqlash sharoiti**: ${t.idealStorage}` : (t.storageRule ? `\n• **Saqlash sharoiti**: ${t.storageRule}` : '');
          return {
            text: `🥗 **${t.nameUz} texnologiyasi va sirlari**:\n\n` +
                  (secretsList ? `**Asosiy sirlar**:\n${secretsList}\n` : '') +
                  wasteInfo +
                  storageInfo,
            template: null
          };
        }
      }

      // 4. Savol-Javoblar (QA Knowledge)
      let bestQa = null;
      let maxScore = 0;

      kb.qaKnowledge.forEach(qa => {
        let score = 0;
        (qa.keywords || []).forEach(k => {
          if (q.includes(k.toLowerCase())) score += 2;
        });
        if (q.includes(qa.topic.toLowerCase())) score += 3;
        if (score > maxScore) {
          maxScore = score;
          bestQa = qa;
        }
      });

      if (bestQa && maxScore >= 2) {
        return {
          text: `💡 **${bestQa.questionUz}**\n\n${bestQa.answerUz}`,
          template: null
        };
      }

      // 5. Chiqindi me'yorlari
      if (q.includes('chiqindi') || q.includes('tozalash') || q.includes('foiz') || q.includes('otxod')) {
        const wasteText = (kb.wasteStandards || [])
          .slice(0, 6)
          .map(w => `• **${w.rawMaterial || w.material || 'Xomashyo'}**: tozalashdagi o'rtacha chiqindi ${w.standardPercent}% (${w.explanationUz || w.notes || ''})`)
          .join('\n');

        return {
          text: `📊 **Koreys salatlarida me'yoriy chiqindi (tozalash yo'qotishi) foizlari**:\n\n` +
                `${wasteText}\n\n` +
                `💡 *Formula*: Brutto = Netto / (1 - Chiqindi%/100). Masalan, 10 kg toza sabzi uchun 11.36 kg xom sabzi xarid qilinadi.`,
          template: null
        };
      }

      // Standart umumiy yordam
      return {
        text: `Salom! Men koreys salatlari bo'yicha sun'iy intellekt texnologingizman.\n\n` +
              `Men sizga quyidagi mavzularda yordam bera olaman:\n` +
              `• **Tannarxni arzonlashtirish**: Ziravorli yog' texnologiyasi, ulgurji xarid va qadoqlash sirlari\n` +
              `• **Muammolar**: Sabzi suv berib yuborishi, salat aynishi yoki yumshashining oldini olish\n` +
              `• **Yangi retseptlar**: Qo'ziqorinli, Kamdi-cha, He yoki Bodring-cha salatlarini kalkulyatorga yuklash\n\n` +
              `Iltimos, aniqroq savol bering yoki yuqoridagi tezkor tugmalardan birini bosing!`,
        template: null
      };
    },

    findMatchingTemplate(query) {
      const q = query.toLowerCase();
      const catalog = getCatalog();
      if (!catalog || !catalog.AI_KNOWLEDGE_BASE) return null;

      const templates = catalog.AI_KNOWLEDGE_BASE.recipeTemplates || [];
      for (const t of templates) {
        const id = t.id.toLowerCase();
        if ((q.includes('qoziqorin') || q.includes("qo'ziqorin") || q.includes('grib') || q.includes('shampinyon')) && id.includes('qoziqorin')) return t;
        if ((q.includes('kamdi') || q.includes('kartoshka')) && id.includes('kamdicha')) return t;
        if ((q.includes('he') || q.includes("go'sht") || q.includes('gosht')) && id.includes('he_goshtli')) return t;
        if ((q.includes('bodring') || q.includes('oi-muchim')) && id.includes('bodringcha')) return t;
      }
      return null;
    },

    async askGemini(query) {
      if (!this.geminiApiKey) return null;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;

      const systemPrompt = "Siz O'zbekistonda koreys salatlari (morkovcha, funchoza, kimchi, baqlajon-cha, fuju, kamdi-cha, he) ishlab chiqaruvchi korxona bosh texnologisiz. Valyuta: O'zbekiston so'mi (UZS). Javoblarni o'zbek tilida, qisqa, tushunarli, amaliy va professional tarzda bering.";

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nFoydalanuvchi savoli: ${query}` }]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API javob bermadi: ${response.status}`);
      }

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        return data.candidates[0].content.parts.map(p => p.text).join('\n');
      }
      return null;
    },

    applyRecipeToApp(recipeId) {
      const catalog = getCatalog();
      if (!catalog || !catalog.AI_KNOWLEDGE_BASE) return;
      const template = (catalog.AI_KNOWLEDGE_BASE.recipeTemplates || []).find(t => t.id === recipeId);
      if (!template) {
        showToast("Retsept shabloni topilmadi", "error");
        return;
      }

      // Retsept mavjudligini tekshirish
      let existing = State.recipes.find(r => r.id === template.id);
      if (!existing) {
        const cloned = catalog.helpers.cloneDeep(template);
        State.recipes.push(cloned);
        existing = cloned;
        showToast(`"${template.nameUz}" muvaffaqiyatli ilovaga qo'shildi!`, "success");
      } else {
        showToast(`"${template.nameUz}" allaqachon mavjud, ochildi!`, "info");
      }

      // Shablon xomashyolarini bazaga qo'shish
      (template.ingredients || []).forEach(ing => {
        if (!State.materials.some(m => m.id === ing.materialId)) {
          State.materials.push({
            id: ing.materialId,
            nameUz: ing.nameUz,
            nameRu: ing.nameRu || '',
            category: 'vegetables',
            unit: ing.unit || 'kg',
            pricePerUnit: ing.unitPrice || 0,
            defaultWastePercent: ing.wastePercent || 0
          });
        }
      });
      renderMaterialsTable();
      populateIngredientModalSelect();

      State.activeRecipeId = existing.id;
      State.batchKg = existing.batchOutputKg || 10.0;
      State.markupPercent = existing.defaultMarkupPercent || 40.0;
      saveState();

      // Kalkulyatorga o'tish va yangilash
      switchTab('tab-kalkulyator');
      renderRecipeDropdown();
      renderActiveRecipeMetaInputs();
      const calc = updateActiveCalculations();
      renderIngredientsTable(calc);
      renderCalculationsUI(calc);

      this.appendMessage(
        `✅ <strong>${escapeHtml(template.nameUz)}</strong> ilovaga yuklandi va kalkulyatorda ochildi! Endi xohlagancha masalliqlar narxi va miqdorini tahrirlashingiz mumkin.`,
        'bot'
      );
    }
  };

  // ==========================================================================
  // 12. EXCEL (CSV) EKSPORT VA CHOP ETISH
  // ==========================================================================

  function exportToCSV() {
    const calc = State.currentCalculations;
    if (!calc) {
      showToast("Eksport qilish uchun retsept hisoblanmadi", "warning");
      return;
    }

    const lines = [];

    // UTF-8 BOM qo'shish (Excelda krill va lotin harflari buzilmasligi uchun)
    lines.push(`\uFEFF"KOREYS SALATLARI TANNARX KALKULYATSIYASI"`);
    lines.push(`"Hujjat raqami:";"${calc.recipeCode}";"Sana:";"${new Date().toLocaleDateString('uz-UZ')}"`);
    lines.push(`"Salat nomi:";"${calc.recipeNameUz}"`);
    lines.push(`"Partiya hajmi (kg):";"${calc.targetBatchKg}";"Kategoriya:";"${calc.category}"`);
    lines.push(``);

    // 1. Xomashyo sarfi jadvali
    lines.push(`"1. XOMASHYOLAR VA RETSEPTURA SARFI"`);
    lines.push(`"№";"Xomashyo nomi";"Birlik";"Netto";"Chiqindi %";"Brutto";"Bir birlik narxi (UZS)";"Jami Summa (UZS)"`);

    calc.ingredients.forEach((ing, i) => {
      lines.push(`"${i + 1}";"${ing.nameUz}";"${ing.unit}";"${ing.netWeight}";"${ing.wastePercent}%";"${ing.grossWeight}";"${ing.unitPrice}";"${ing.cost}"`);
    });

    lines.push(`"";"JAMI XOMASHYO:";"";"${calc.totalNetWeight} kg";"";"${calc.totalGrossWeight} kg";"";"${calc.rawMaterialsTotalCost}"`);
    lines.push(``);

    // 2. Operatsion va qadoqlash xarajatlari
    lines.push(`"2. ISH HAQI VA OPERATSION XARAJATLAR"`);
    lines.push(`"Xarajat turi";"Miqdori (UZS)"`);
    lines.push(`"Ish haqi (Mehnat sarfi)";"${calc.totalLaborCost}"`);
    lines.push(`"Qadoqlash (Idish, stiker)";"${calc.packaging.packagingTotalCost}"`);
    lines.push(`"Kommunal (Elektr, gaz, suv)";"${calc.totalUtilitiesCost}"`);
    lines.push(`"Transport va yetkazish";"${calc.totalTransportCost}"`);
    lines.push(`"Amortizatsiya (uskunalar eskirishi)";"${calc.totalDepreciationCost}"`);
    lines.push(`"Ma'muriy va boshqa (Overhead)";"${calc.totalOverheadCost || 0}"`);
    lines.push(``);

    // 3. Yakuniy tannarx va daromad ko'rsatkichlari
    lines.push(`"3. YAKUNIY TANNARX VA NARX BELGILASH"`);
    lines.push(`"Ko'rsatkich";"Qiymat"`);
    lines.push(`"Jami Partiya Tannarxi:";"${calc.totalBatchCost} UZS"`);
    lines.push(`"1 kg Tayyor Salat Tannarxi:";"${calc.costPerKg} UZS"`);
    lines.push(`"1 Qadoq (idish) Tannarxi:";"${calc.costPerPortion} UZS"`);
    lines.push(`"Savdo Ustamasi:";"${calc.markupPercent}%"`);
    lines.push(`"Tavsiya Etilgan Sotish Narxi (1 kg):";"${calc.recommendedSellingPricePerKg} UZS"`);
    lines.push(`"Partiya Bo'yicha Sof Foyda:";"${calc.netProfitTotal} UZS"`);
    lines.push(`"Rentabellik (Marja):";"${calc.profitabilityMarginPercent}%"`);

    const csvContent = lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const safeName = calc.recipeNameUz.replace(/[^a-zA-Z0-9_\u0400-\u04FF]/g, '_');
    const fileName = `Tannarx_${safeName}_${calc.targetBatchKg}kg.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Excel (CSV) fayli muvaffaqiyatli yuklab olindi!", "success");
  }

  function printTexkarta() {
    // Texkarta tabiga o'tkazamiz
    switchTab('tab-texkarta');
    renderTexkarta();
    setTimeout(() => {
      window.print();
    }, 200);
  }

  // ==========================================================================
  // 13. TABLARNI BOSHQARISH
  // ==========================================================================

  function switchTab(tabId) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
        const icon = btn.querySelector('i');
        if (icon) icon.className = icon.className.replace('text-slate-500', 'text-primary-600');
      } else {
        btn.classList.remove('active');
        const icon = btn.querySelector('i');
        if (icon) icon.className = icon.className.replace('text-primary-600', 'text-slate-500');
      }
    });

    tabContents.forEach(content => {
      if (content.id === tabId) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    // Agar grafiklar tabi ochilsa, Chart.js qayta chiziladi
    if (tabId === 'tab-grafika') {
      setTimeout(() => {
        if (State.currentCalculations) {
          renderCharts(State.currentCalculations);
        }
      }, 50);
    } else if (tabId === 'tab-texkarta') {
      renderTexkarta();
    }
  }

  // ==========================================================================
  // 14. RETSEPT VA XOMASHYO CRUD HARAKATLARI
  // ==========================================================================

  function handleBatchChange(newBatch) {
    const val = parseNumberInput(newBatch, NaN);
    if (!isNaN(val) && val > 0) {
      State.batchKg = val;
      saveState();
      const calc = updateActiveCalculations();
      renderIngredientsTable(calc);
      renderCalculationsUI(calc);
    }
  }

  function handleMarkupChange(newMarkup) {
    const val = parseNumberInput(newMarkup, NaN);
    if (!isNaN(val) && val >= 0) {
      State.markupPercent = Math.max(0, val);
      const range = document.getElementById('markup-range');
      const input = document.getElementById('markup-percent-input');
      const label = document.getElementById('label-markup-percent');
      if (range) range.value = State.markupPercent;
      if (input) input.value = State.markupPercent;
      if (label) label.textContent = State.markupPercent + "%";

      saveState();
      const calc = updateActiveCalculations();
      renderCalculationsUI(calc);
    }
  }

  function syncUIWithState() {
    renderRecipeDropdown();
    renderActiveRecipeMetaInputs();
    const calc = updateActiveCalculations();
    renderKPIsAndSummary(calc);
    renderIngredientsTable(calc);
    renderMaterialsTable();
  }

  function renderAll() {
    syncUIWithState();
    const calc = State.currentCalculations;
    if (calc) {
      renderCharts(calc);
      renderTexkarta();
    }
  }

  function duplicateActiveRecipe() {
    const recipe = getActiveRecipe();
    if (!recipe) {
      showToast("Nusxa olish uchun retsept mavjud emas!", "warning");
      return;
    }

    const catalog = getCatalog();
    const cloned = catalog ? catalog.helpers.cloneDeep(recipe) : JSON.parse(JSON.stringify(recipe));
    
    cloned.id = 'recipe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    cloned.nameUz = `${recipe.nameUz} (Nusxa)`;
    cloned.code = 'REC-' + (State.recipes.length + 1).toString().padStart(2, '0');

    State.recipes.push(cloned);
    State.activeRecipeId = cloned.id;

    saveState();
    renderRecipeDropdown();
    renderActiveRecipeMetaInputs();
    const calc = updateActiveCalculations();
    renderIngredientsTable(calc);
    renderCalculationsUI(calc);
    showToast(`"${recipe.nameUz}" nusxalandi!`, "success");
  }

  function deleteActiveRecipe() {
    if (State.recipes.length === 0) {
      showToast("O'chirish uchun retsept mavjud emas!", "warning");
      return;
    }

    const recipe = getActiveRecipe();
    if (!recipe) return;

    confirmDialog("Retseptni o'chirish", `Haqiqatan ham "${recipe.nameUz}" retseptini butunlay o'chirmoqchimisiz?`, () => {
      State.recipes = State.recipes.filter(r => r.id !== recipe.id);
      State.activeRecipeId = State.recipes.length > 0 ? State.recipes[0].id : '';

      saveState();
      renderRecipeDropdown();
      renderActiveRecipeMetaInputs();
      const calc = updateActiveCalculations();
      renderIngredientsTable(calc);
      renderCalculationsUI(calc);
      showToast(`"${recipe.nameUz}" o'chirildi`, "info");
    });
  }

  // ==========================================================================
  // 15. HODISALARNI BIRIKTIRISH (EVENT LISTENERS)
  // ==========================================================================

  function initEventListeners() {
    // 1. Tablar navigatsiyasi
    const tabsNav = document.getElementById('app-tabs-nav');
    if (tabsNav) {
      tabsNav.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (btn) {
          const tabId = btn.getAttribute('data-tab');
          if (tabId) switchTab(tabId);
        }
      });
    }

    // 2. Retsept tanlash dropdown
    const recipeSelect = document.getElementById('recipe-select');
    if (recipeSelect) {
      recipeSelect.addEventListener('change', (e) => {
        State.activeRecipeId = e.target.value;
        saveState();
        renderRecipeDropdown();
        renderActiveRecipeMetaInputs();
        const calc = updateActiveCalculations();
        renderKPIsAndSummary(calc);
        renderIngredientsTable(calc);
        renderCalculationsUI(calc);
        showToast("Retsept almashtirildi", "info");
      });
    }

    // Texkarta retsept tanlash
    const texRecipeSelect = document.getElementById('texkarta-recipe-select');
    if (texRecipeSelect) {
      texRecipeSelect.addEventListener('change', (e) => {
        State.activeRecipeId = e.target.value;
        saveState();
        renderRecipeDropdown();
        renderActiveRecipeMetaInputs();
        const calc = updateActiveCalculations();
        renderKPIsAndSummary(calc);
        renderIngredientsTable(calc);
        renderTexkarta();
      });
    }

    // 3. Partiya hajmi (Batch weight)
    const batchInput = document.getElementById('batch-weight-input');
    if (batchInput) {
      batchInput.addEventListener('input', (e) => {
        handleBatchChange(e.target.value);
      });
    }

    // Tezkor partiya tugmalari (5kg, 10kg, 25kg, 50kg)
    document.querySelectorAll('.btn-quick-batch').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        if (val) {
          if (batchInput) batchInput.value = val;
          handleBatchChange(val);
        }
      });
    });

    // 4. Savdo ustamasi (Markup)
    const markupRange = document.getElementById('markup-range');
    const markupInput = document.getElementById('markup-percent-input');

    if (markupRange) {
      markupRange.addEventListener('input', (e) => {
        handleMarkupChange(e.target.value);
      });
    }
    if (markupInput) {
      markupInput.addEventListener('input', (e) => {
        handleMarkupChange(e.target.value);
      });
    }

    // 5. Retsept ichidagi ingredientlarni jonli tahrirlash (Netto va Chiqindi %)
    const ingredientsBody = document.getElementById('recipe-ingredients-body');
    if (ingredientsBody) {
      ingredientsBody.addEventListener('input', (e) => {
        const input = e.target.closest('.ing-input-edit');
        if (!input) return;

        const idx = parseInt(input.getAttribute('data-ing-idx'), 10);
        const field = input.getAttribute('data-field');
        const recipe = getActiveRecipe();
        if (!recipe || !recipe.ingredients || !recipe.ingredients[idx]) return;

        const val = Math.max(0, parseNumberInput(input.value, 0));
        const scale = State.batchKg / (recipe.batchOutputKg || 10.0);

        if (field === 'netWeight') {
          const baseNetto = val / (scale > 0 ? scale : 1.0);
          const waste = recipe.ingredients[idx].wastePercent || 0;
          const wp = Math.max(0, Math.min(99.9, waste));
          const baseGross = baseNetto / (1 - wp / 100);

          recipe.ingredients[idx].netWeight = Number(baseNetto.toFixed(4));
          recipe.ingredients[idx].grossWeight = Number(baseGross.toFixed(4));
        } else if (field === 'wastePercent') {
          const wp = Math.max(0, Math.min(95, val));
          recipe.ingredients[idx].wastePercent = wp;
          const net = recipe.ingredients[idx].netWeight || 0;
          recipe.ingredients[idx].grossWeight = Number((net / (1 - wp / 100)).toFixed(4));
        }

        saveState();
        const calc = updateActiveCalculations();
        renderKPIsAndSummary(calc);

        const row = input.closest('tr');
        if (row && calc.ingredients[idx]) {
          const ingCalc = calc.ingredients[idx];
          const costCell = row.querySelector('.ing-cost-cell') || row.cells[6];
          if (costCell) costCell.textContent = formatMoney(ingCalc.cost);
        }

        const grafikaTab = document.getElementById('tab-grafika');
        if (grafikaTab && grafikaTab.classList.contains('active')) {
          renderCharts(calc);
        }
      });

      // Ingredientni o'chirish
      ingredientsBody.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-delete-ingredient');
        if (!btn) return;

        const idx = parseInt(btn.getAttribute('data-ing-idx'), 10);
        const recipe = getActiveRecipe();
        if (!recipe || !recipe.ingredients) return;

        const ingName = recipe.ingredients[idx] ? (recipe.ingredients[idx].nameUz || "xomashyo") : "";
        confirmDialog("Xomashyoni o'chirish", `"${ingName}" xomashyosini retseptdan o'chirmoqchimisiz?`, () => {
          recipe.ingredients.splice(idx, 1);
          saveState();
          const calc = updateActiveCalculations();
          renderIngredientsTable(calc);
          renderCalculationsUI(calc);
          showToast("Xomashyo retseptdan olib tashlandi", "info");
        });
      });
    }

    // 6. Operatsion xarajatlar inputlarini tinglash
    const inputLabor = document.getElementById('input-labor-rate');
    const inputUtility = document.getElementById('input-utility-cost');
    const inputTransport = document.getElementById('input-transport-cost');
    const inputDepr = document.getElementById('input-depreciation-cost');
    const inputOverhead = document.getElementById('input-overhead-cost');

    function updateOperationalCostsFromInputs() {
      const recipe = getActiveRecipe();
      if (!recipe) return;
      if (!recipe.operationalCosts) recipe.operationalCosts = {};

      if (inputLabor) recipe.operationalCosts.laborPerKg = Math.max(0, parseNumberInput(inputLabor.value, 0));
      if (inputUtility) recipe.operationalCosts.utilitiesPerKg = Math.max(0, parseNumberInput(inputUtility.value, 0));
      if (inputTransport) recipe.operationalCosts.transportPerKg = Math.max(0, parseNumberInput(inputTransport.value, 0));
      if (inputDepr) recipe.operationalCosts.depreciationPerKg = Math.max(0, parseNumberInput(inputDepr.value, 0));
      if (inputOverhead) recipe.operationalCosts.overheadPerKg = Math.max(0, parseNumberInput(inputOverhead.value, 0));

      saveState();
      const calc = updateActiveCalculations();
      renderCalculationsUI(calc);
    }

    [inputLabor, inputUtility, inputTransport, inputDepr, inputOverhead].forEach(input => {
      if (input) {
        input.addEventListener('input', updateOperationalCostsFromInputs);
      }
    });

    // 7. Qadoqlash konfiguratsiyasini tinglash
    const selectPack = document.getElementById('select-packaging-type');
    const inputPackCost = document.getElementById('input-packaging-unit-cost');
    const inputLabelCost = document.getElementById('input-label-cost');

    if (selectPack) {
      selectPack.addEventListener('change', (e) => {
        const opt = e.target.selectedOptions[0];
        const val = e.target.value;
        const size = parseFloat(opt.getAttribute('data-size')) || 0.5;
        const costAttr = opt.getAttribute('data-cost');
        const cost = costAttr !== null ? parseFloat(costAttr) : 900;

        const recipe = getActiveRecipe();
        if (recipe) {
          if (!recipe.packagingConfig) recipe.packagingConfig = {};
          recipe.packagingConfig.portionSizeKg = size;
          recipe.packagingConfig.defaultType = val;
          recipe.packagingConfig.containerUnitCost = cost;
          if (inputPackCost) inputPackCost.value = cost;

          if (val === 'bulk') {
            recipe.packagingConfig.labelUnitCost = 0;
            recipe.packagingConfig.containerUnitCost = 0;
            if (inputLabelCost) inputLabelCost.value = 0;
            if (inputPackCost) inputPackCost.value = 0;
          }

          saveState();
          const calc = updateActiveCalculations();
          renderCalculationsUI(calc);
        }
      });
    }

    if (inputPackCost) {
      inputPackCost.addEventListener('input', (e) => {
        const recipe = getActiveRecipe();
        if (recipe) {
          if (!recipe.packagingConfig) recipe.packagingConfig = {};
          recipe.packagingConfig.containerUnitCost = Math.max(0, parseNumberInput(e.target.value, 0));
          saveState();
          const calc = updateActiveCalculations();
          renderCalculationsUI(calc);
        }
      });
    }

    if (inputLabelCost) {
      inputLabelCost.addEventListener('input', (e) => {
        const recipe = getActiveRecipe();
        if (recipe) {
          if (!recipe.packagingConfig) recipe.packagingConfig = {};
          recipe.packagingConfig.labelUnitCost = Math.max(0, parseNumberInput(e.target.value, 0));
          saveState();
          const calc = updateActiveCalculations();
          renderCalculationsUI(calc);
        }
      });
    }

    // 8. Xomashyo narxlarini jadvalda inline tahrirlash (Tab 2)
    const materialsTableBody = document.getElementById('materials-table-body');
    if (materialsTableBody) {
      materialsTableBody.addEventListener('change', (e) => {
        const input = e.target.closest('.mat-price-inline-input');
        if (!input) return;

        const matId = input.getAttribute('data-mat-id');
        const newPrice = parseNumberInput(input.value, NaN);
        if (isNaN(newPrice) || newPrice < 0) return;

        const mat = State.materials.find(m => m.id === matId);
        if (mat) {
          mat.pricePerUnit = newPrice;
          saveState();
          const calc = updateActiveCalculations();
          renderIngredientsTable(calc);
          renderCalculationsUI(calc);
          showToast(`"${mat.nameUz}" narxi yangilandi. Retseptlar qayta hisoblandi!`, "success");
        }
      });

      materialsTableBody.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit-material');
        const btnDel = e.target.closest('.btn-delete-material');

        if (btnEdit) {
          const matId = btnEdit.getAttribute('data-mat-id');
          openEditMaterialModal(matId);
        } else if (btnDel) {
          const matId = btnDel.getAttribute('data-mat-id');
          deleteMaterial(matId);
        }
      });
    }

    const matSearchInput = document.getElementById('materials-search-input');
    const matCatFilter = document.getElementById('materials-category-filter');

    if (matSearchInput) {
      matSearchInput.addEventListener('input', (e) => {
        State.materialsSearch = e.target.value;
        renderMaterialsTable();
      });
    }
    if (matCatFilter) {
      matCatFilter.addEventListener('change', (e) => {
        State.materialsFilter = e.target.value;
        renderMaterialsTable();
      });
    }

    // 9. Xomashyo qo'shish modali (Modal 1)
    const btnOpenMatModal = document.getElementById('btn-open-material-modal');
    if (btnOpenMatModal) {
      btnOpenMatModal.addEventListener('click', () => {
        openCreateMaterialModal();
      });
    }

    const formMaterial = document.getElementById('form-material');
    if (formMaterial) {
      formMaterial.addEventListener('submit', (e) => {
        e.preventDefault();
        saveMaterialFromModal();
      });
    }

    // 10. Retseptga ingredient qo'shish modali (Modal 2)
    const btnAddIng = document.getElementById('btn-add-ingredient');
    if (btnAddIng) {
      btnAddIng.addEventListener('click', () => {
        openAddIngredientModal();
      });
    }

    const ingMatSelect = document.getElementById('ingredient-select-material');
    const ingNettoInput = document.getElementById('ingredient-input-netto');
    const ingWasteInput = document.getElementById('ingredient-input-waste');

    function updateModalIngredientPreview() {
      if (!ingMatSelect) return;
      const matId = ingMatSelect.value;
      let unitPrice = 0;
      let unit = 'kg';

      if (matId === '__NEW__') {
        const quickPriceInput = document.getElementById('quick-mat-price');
        unitPrice = parseNumberInput(quickPriceInput ? quickPriceInput.value : '', 0);
        const quickUnit = document.getElementById('quick-mat-unit');
        if (quickUnit) unit = quickUnit.value || 'kg';
      } else {
        const mat = State.materials.find(m => m.id === matId);
        if (!mat) return;
        unitPrice = mat.pricePerUnit || 0;
        unit = mat.unit || 'kg';
      }

      const netto = parseFloat(ingNettoInput ? ingNettoInput.value : '') || 0;
      const waste = parseFloat(ingWasteInput ? ingWasteInput.value : '') || 0;
      const wp = Math.max(0, Math.min(99.9, waste));
      const brutto = netto / (1 - wp / 100);
      const total = brutto * unitPrice;

      const bruttoEl = document.getElementById('ingredient-calc-brutto');
      const priceEl = document.getElementById('ingredient-calc-price');
      const totalEl = document.getElementById('ingredient-calc-total');

      if (bruttoEl) bruttoEl.textContent = `${brutto.toFixed(3)} ${unit}`;
      if (priceEl) priceEl.textContent = formatMoney(unitPrice);
      if (totalEl) totalEl.textContent = formatMoney(total);
    }

    if (ingMatSelect) {
      ingMatSelect.addEventListener('change', () => {
        if (ingMatSelect.value === '__NEW__') {
          const quickPanel = document.getElementById('quick-material-panel');
          if (quickPanel) {
            quickPanel.classList.remove('hidden');
            const nameInput = document.getElementById('quick-mat-name');
            if (nameInput) nameInput.focus();
          }
          return;
        }

        const quickPanel = document.getElementById('quick-material-panel');
        if (quickPanel && !quickPanel.classList.contains('hidden')) {
          quickPanel.classList.add('hidden');
        }

        const matId = ingMatSelect.value;
        const mat = State.materials.find(m => m.id === matId);
        if (mat) {
          const unitBadge = document.getElementById('ingredient-unit-badge');
          if (unitBadge) unitBadge.textContent = mat.unit || 'kg';
          if (ingWasteInput) ingWasteInput.value = mat.defaultWastePercent || 0;
        }
        updateModalIngredientPreview();
      });
    }

    // Tezkor yangi xomashyo qo'shish paneli hodisalari
    const btnQuickNewMat = document.getElementById('btn-quick-new-material');
    const quickMatPanel = document.getElementById('quick-material-panel');
    const btnCloseQuickMat = document.getElementById('btn-close-quick-mat');
    const btnSaveQuickMat = document.getElementById('btn-save-quick-mat');

    if (btnQuickNewMat && quickMatPanel) {
      btnQuickNewMat.addEventListener('click', () => {
        quickMatPanel.classList.toggle('hidden');
        if (!quickMatPanel.classList.contains('hidden')) {
          if (ingMatSelect) ingMatSelect.value = '__NEW__';
          const nameInput = document.getElementById('quick-mat-name');
          if (nameInput) nameInput.focus();
        }
      });
    }

    if (btnCloseQuickMat && quickMatPanel) {
      btnCloseQuickMat.addEventListener('click', () => {
        quickMatPanel.classList.add('hidden');
        if (ingMatSelect.value === '__NEW__' && State.materials.length > 0) {
          ingMatSelect.value = State.materials[0].id;
          updateModalIngredientPreview();
        }
      });
    }

    if (btnSaveQuickMat) {
      btnSaveQuickMat.addEventListener('click', () => {
        const name = (document.getElementById('quick-mat-name').value || '').trim();
        const price = parseNumberInput(document.getElementById('quick-mat-price').value, NaN);
        const unit = document.getElementById('quick-mat-unit').value || 'kg';
        const waste = parseNumberInput(document.getElementById('quick-mat-waste').value, 0);

        if (!name) {
          showToast("Xomashyo nomini kiriting!", "warning");
          return;
        }
        if (isNaN(price) || price < 0) {
          showToast("Xomashyo narxini kiriting!", "warning");
          return;
        }
        if (isNaN(waste) || waste < 0 || waste >= 100) {
          showToast("Chiqindi foizi 0 va 99.9 oralig'ida bo'lishi kerak!", "warning");
          return;
        }

        const newMatId = 'mat_custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const newMat = {
          id: newMatId,
          nameUz: name,
          nameRu: '',
          category: 'vegetables',
          unit: unit,
          pricePerUnit: price,
          defaultWastePercent: waste
        };

        State.materials.push(newMat);
        saveState();

        // Dropdownlarni yangilash va yangi xomashyoni tanlash
        populateIngredientModalSelect(newMatId);
        const rbSelect = document.getElementById('rb-add-material-select');
        if (rbSelect) {
          const opt = document.createElement('option');
          opt.value = newMatId;
          opt.textContent = `${name} (${unit} - ${formatMoney(price)})`;
          rbSelect.appendChild(opt);
        }
        updateModalIngredientPreview();
        renderMaterialsTable();

        // Formani tozalash va yashirish
        document.getElementById('quick-mat-name').value = '';
        document.getElementById('quick-mat-price').value = '';
        if (quickMatPanel) quickMatPanel.classList.add('hidden');

        showToast(`"${name}" yangi xomashyo sifatida saqlandi va tanlandi!`, "success");
      });
    }

    if (ingNettoInput) ingNettoInput.addEventListener('input', updateModalIngredientPreview);
    if (ingWasteInput) ingWasteInput.addEventListener('input', updateModalIngredientPreview);

    const quickMatPriceEl = document.getElementById('quick-mat-price');
    const quickMatUnitEl = document.getElementById('quick-mat-unit');
    const quickMatWasteEl = document.getElementById('quick-mat-waste');
    if (quickMatPriceEl) quickMatPriceEl.addEventListener('input', updateModalIngredientPreview);
    if (quickMatUnitEl) quickMatUnitEl.addEventListener('change', updateModalIngredientPreview);
    if (quickMatWasteEl) quickMatWasteEl.addEventListener('input', () => {
      if (ingWasteInput && ingMatSelect && ingMatSelect.value === '__NEW__') {
        ingWasteInput.value = quickMatWasteEl.value;
      }
      updateModalIngredientPreview();
    });

    const formIngredient = document.getElementById('form-ingredient');
    if (formIngredient) {
      formIngredient.addEventListener('submit', (e) => {
        e.preventDefault();
        saveIngredientToRecipe();
      });
    }

    // 11. To'liq imkoniyatli Retsept Konstruktori (Recipe Builder - Modal 5)
    const btnOpenNewRecipe = document.getElementById('btn-open-new-recipe');
    if (btnOpenNewRecipe) {
      btnOpenNewRecipe.addEventListener('click', () => {
        RecipeBuilder.open(null);
      });
    }

    const btnEditActiveRecipe = document.getElementById('btn-edit-active-recipe');
    if (btnEditActiveRecipe) {
      btnEditActiveRecipe.addEventListener('click', () => {
        RecipeBuilder.open(State.activeRecipeId);
      });
    }

    const btnEditRecipeMeta = document.getElementById('btn-edit-recipe-meta');
    if (btnEditRecipeMeta) {
      btnEditRecipeMeta.addEventListener('click', () => {
        RecipeBuilder.open(State.activeRecipeId);
      });
    }

    const btnRbAddIngredient = document.getElementById('btn-rb-add-ingredient');
    if (btnRbAddIngredient) {
      btnRbAddIngredient.addEventListener('click', () => {
        RecipeBuilder.addIngredient();
      });
    }

    const btnRbQuickNew = document.getElementById('btn-rb-quick-new-material');
    if (btnRbQuickNew) {
      btnRbQuickNew.addEventListener('click', () => {
        openCreateMaterialModal();
      });
    }

    const rbMatSelect = document.getElementById('rb-add-material-select');
    if (rbMatSelect) {
      rbMatSelect.addEventListener('change', () => {
        const mat = State.materials.find(m => m.id === rbMatSelect.value);
        const wasteInput = document.getElementById('rb-add-waste-input');
        if (mat && wasteInput) {
          wasteInput.value = mat.defaultWastePercent || 0;
        }
      });
    }

    const rbIngredientsTbody = document.getElementById('rb-ingredients-tbody');
    if (rbIngredientsTbody) {
      // O'chirish
      rbIngredientsTbody.addEventListener('click', (e) => {
        const btnDel = e.target.closest('.btn-rb-del-ing');
        if (btnDel) {
          const idx = parseInt(btnDel.getAttribute('data-idx'), 10);
          if (!isNaN(idx) && RecipeBuilderState.ingredients[idx]) {
            RecipeBuilderState.ingredients.splice(idx, 1);
            RecipeBuilder.renderIngredientsTable();
          }
        }
      });

      // Inline tahrirlash (fokusni yo'qotmaslik uchun qatorni joyida yangilash)
      rbIngredientsTbody.addEventListener('input', (e) => {
        const input = e.target.closest('.rb-inline-input');
        if (!input) return;

        const idx = parseInt(input.getAttribute('data-idx'), 10);
        const field = input.getAttribute('data-field');
        const val = Math.max(0, parseNumberInput(input.value, 0));

        const ing = RecipeBuilderState.ingredients[idx];
        if (ing) {
          if (field === 'netWeight') {
            ing.netWeight = val;
          } else if (field === 'wastePercent') {
            ing.wastePercent = Math.max(0, Math.min(95, val));
          }

          const materialsMap = getRawMaterialsMap();
          const mat = materialsMap[ing.materialId];
          const unitPrice = mat ? (Number(mat.pricePerUnit) || 0) : (Number(ing.unitPrice) || 0);
          const wp = Math.max(0, Math.min(99.9, Number(ing.wastePercent) || 0));
          const net = Math.max(0, Number(ing.netWeight) || 0);
          const gross = Number((net / (1 - wp / 100)).toFixed(4));
          ing.grossWeight = gross;
          ing.unitPrice = unitPrice;

          const rawUnit = (ing.unit || (mat && mat.unit) || 'kg').toLowerCase().trim();
          const isGram = (rawUnit === 'gr' || rawUnit === 'g' || rawUnit === 'gram' || rawUnit === 'gramm');
          const effectiveGrossKg = isGram ? (gross / 1000) : gross;
          const cost = Math.round(effectiveGrossKg * unitPrice);

          // Jadval qatorini joyida yangilash
          const row = input.closest('tr');
          if (row) {
            if (row.cells[4]) row.cells[4].textContent = gross.toFixed(3);
            if (row.cells[5]) row.cells[5].textContent = formatMoney(unitPrice);
            if (row.cells[6]) row.cells[6].textContent = formatMoney(cost);
          }

          // Footer summalarini hisoblash va yangilash
          let totalGross = 0;
          let totalCost = 0;
          RecipeBuilderState.ingredients.forEach(item => {
            const m = materialsMap[item.materialId];
            const up = m ? (Number(m.pricePerUnit) || 0) : (Number(item.unitPrice) || 0);
            const w = Math.max(0, Math.min(99.9, Number(item.wastePercent) || 0));
            const n = Math.max(0, Number(item.netWeight) || 0);
            const g = Number((n / (1 - w / 100)).toFixed(4));
            const itemUnit = (item.unit || (m && m.unit) || 'kg').toLowerCase().trim();
            const itemIsGram = (itemUnit === 'gr' || itemUnit === 'g' || itemUnit === 'gram' || itemUnit === 'gramm');
            const gKg = itemIsGram ? (g / 1000) : g;
            totalGross += gKg;
            totalCost += Math.round(gKg * up);
          });

          const footerBrutto = document.getElementById('rb-footer-brutto');
          const footerCost = document.getElementById('rb-footer-total-cost');
          if (footerBrutto) footerBrutto.textContent = `${totalGross.toFixed(2)} kg`;
          if (footerCost) footerCost.textContent = formatMoney(totalCost);
        }
      });
    }

    const formRecipeBuilder = document.getElementById('form-recipe-builder');
    if (formRecipeBuilder) {
      formRecipeBuilder.addEventListener('submit', (e) => {
        e.preventDefault();
        RecipeBuilder.save();
      });
    }

    // Nusxalash va O'chirish
    const btnDuplicateRecipe = document.getElementById('btn-duplicate-recipe');
    if (btnDuplicateRecipe) {
      btnDuplicateRecipe.addEventListener('click', duplicateActiveRecipe);
    }

    const btnDeleteRecipe = document.getElementById('btn-delete-recipe');
    if (btnDeleteRecipe) {
      btnDeleteRecipe.addEventListener('click', deleteActiveRecipe);
    }

    // 12. Modal yopish tugmalari
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal) modal.classList.add('hidden');
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', () => {
        const modal = bd.closest('.modal');
        if (modal) modal.classList.add('hidden');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
        SalatAIAgent.toggleDrawer(false);
      }
    });

    // 13. Tasdiqlash modali tugmalari
    const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
    const btnConfirmOk = document.getElementById('btn-confirm-ok');

    if (btnConfirmCancel) {
      btnConfirmCancel.addEventListener('click', () => {
        closeModal('modal-confirm');
        State.confirmCallback = null;
      });
    }

    if (btnConfirmOk) {
      btnConfirmOk.addEventListener('click', () => {
        if (typeof State.confirmCallback === 'function') {
          State.confirmCallback();
        }
        closeModal('modal-confirm');
        State.confirmCallback = null;
      });
    }

    // 14. Excel va Chop etish tugmalari
    const btnExportExcel = document.getElementById('btn-export-excel');
    const btnExportTexkartaCsv = document.getElementById('btn-export-texkarta-csv');
    const btnPrintTexkarta = document.getElementById('btn-print-texkarta');
    const btnPrintTexkartaAction = document.getElementById('btn-print-texkarta-action');

    if (btnExportExcel) btnExportExcel.addEventListener('click', exportToCSV);
    if (btnExportTexkartaCsv) btnExportTexkartaCsv.addEventListener('click', exportToCSV);
    if (btnPrintTexkarta) btnPrintTexkarta.addEventListener('click', printTexkarta);
    if (btnPrintTexkartaAction) btnPrintTexkartaAction.addEventListener('click', printTexkarta);

    // 15. Barcha ma'lumotlarni tozalash (Clear all data)
    const btnResetData = document.getElementById('btn-reset-data');
    if (btnResetData) {
      btnResetData.addEventListener('click', () => {
        confirmDialog(
          "Ma'lumotlarni tozalash",
          "Barcha salatlar, retseptlar va xomashyolarni butunlay o'chirib, bazani toza (noldan) holatga keltirmoqchimisiz?",
          () => {
            resetToDefaults();
          }
        );
      });
    }

    // 16. LOKAL AI AGENT HODISALARI
    SalatAIAgent.init();

    const btnToggleAiChat = document.getElementById('btn-toggle-ai-chat');
    if (btnToggleAiChat) {
      btnToggleAiChat.addEventListener('click', () => {
        SalatAIAgent.toggleDrawer();
      });
    }

    const btnCloseAiChat = document.getElementById('btn-close-ai-chat');
    if (btnCloseAiChat) {
      btnCloseAiChat.addEventListener('click', () => {
        SalatAIAgent.toggleDrawer(false);
      });
    }

    const btnClearAiChat = document.getElementById('btn-clear-ai-chat');
    if (btnClearAiChat) {
      btnClearAiChat.addEventListener('click', () => {
        const container = document.getElementById('ai-chat-messages');
        if (container) {
          container.innerHTML = `
            <div class="flex items-start space-x-2.5">
              <div class="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs flex-shrink-0 shadow-xs">
                🤖
              </div>
              <div class="ai-bubble-bot p-3.5 rounded-2xl max-w-[85%] text-slate-800 leading-relaxed shadow-xs">
                <p class="font-bold text-slate-900 mb-1">Chat tozalandi! 👋</p>
                <p>Koreys salatlari bo'yicha qanday savolingiz bor? Marhamat, yozing!</p>
              </div>
            </div>
          `;
        }
      });
    }

    // Tezkor savol chipslari (Quick Chips)
    const quickChipsContainer = document.getElementById('ai-quick-chips');
    if (quickChipsContainer) {
      quickChipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.ai-chip-btn');
        if (chip) {
          const prompt = chip.getAttribute('data-prompt');
          if (prompt) {
            SalatAIAgent.handleUserQuery(prompt);
          }
        }
      });
    }

    // Chat formasi
    const aiChatForm = document.getElementById('ai-chat-form');
    const aiChatInput = document.getElementById('ai-chat-input');
    if (aiChatForm && aiChatInput) {
      aiChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = aiChatInput.value.trim();
        if (query) {
          aiChatInput.value = '';
          SalatAIAgent.handleUserQuery(query);
        }
      });
    }

    // AI tavsiya qilgan retseptni ilovaga qo'shish tugmasi (delegated)
    const aiChatMessages = document.getElementById('ai-chat-messages');
    if (aiChatMessages) {
      aiChatMessages.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-ai-apply-recipe');
        if (btn) {
          const recId = btn.getAttribute('data-recipe-id');
          if (recId) {
            SalatAIAgent.applyRecipeToApp(recId);
          }
        }
      });
    }

    // Gemini API kalit paneli
    const btnToggleGeminiKey = document.getElementById('btn-toggle-gemini-key');
    const apiKeyPanel = document.getElementById('ai-api-key-panel');
    const inputApiKey = document.getElementById('input-gemini-api-key');
    const btnSaveApiKey = document.getElementById('btn-save-gemini-key');
    const btnClearApiKey = document.getElementById('btn-clear-gemini-key');

    if (btnToggleGeminiKey && apiKeyPanel) {
      btnToggleGeminiKey.addEventListener('click', () => {
        apiKeyPanel.classList.toggle('hidden');
      });
    }

    if (btnSaveApiKey && inputApiKey) {
      btnSaveApiKey.addEventListener('click', () => {
        const val = inputApiKey.value.trim();
        if (val) {
          SalatAIAgent.geminiApiKey = val;
          localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, val);
          showToast("Gemini API kaliti saqlandi!", "success");
          if (apiKeyPanel) apiKeyPanel.classList.add('hidden');
        }
      });
    }

    if (btnClearApiKey && inputApiKey) {
      btnClearApiKey.addEventListener('click', () => {
        SalatAIAgent.geminiApiKey = '';
        inputApiKey.value = '';
        localStorage.removeItem(STORAGE_KEYS.GEMINI_API_KEY);
        showToast("API kaliti o'chirildi. Lokal AI rejimiga o'tildi.", "info");
      });
    }
  }

  // ==========================================================================
  // 16. MODAL CRUD FUNKSIYALARI
  // ==========================================================================

  // --- XOMASHYO CRUD ---
  function openCreateMaterialModal() {
    const title = document.getElementById('modal-material-title');
    if (title) title.textContent = "Yangi Xomashyo Qo'shish";

    document.getElementById('mat-field-id').value = '';
    document.getElementById('mat-field-name').value = '';
    document.getElementById('mat-field-name-ru').value = '';
    document.getElementById('mat-field-category').value = 'vegetables';
    document.getElementById('mat-field-unit').value = 'kg';
    document.getElementById('mat-field-price').value = '';
    document.getElementById('mat-field-waste').value = '0';

    openModal('modal-material');
  }

  function openEditMaterialModal(matId) {
    const mat = State.materials.find(m => m.id === matId);
    if (!mat) return;

    const title = document.getElementById('modal-material-title');
    if (title) title.textContent = "Xomashyoni Tahrirlash";

    document.getElementById('mat-field-id').value = mat.id;
    document.getElementById('mat-field-name').value = mat.nameUz || '';
    document.getElementById('mat-field-name-ru').value = mat.nameRu || '';
    document.getElementById('mat-field-category').value = mat.category || 'vegetables';
    document.getElementById('mat-field-unit').value = mat.unit || 'kg';
    document.getElementById('mat-field-price').value = mat.pricePerUnit || 0;
    document.getElementById('mat-field-waste').value = mat.defaultWastePercent || 0;

    openModal('modal-material');
  }

  function saveMaterialFromModal() {
    const id = document.getElementById('mat-field-id').value;
    const nameUz = document.getElementById('mat-field-name').value.trim();
    const nameRu = document.getElementById('mat-field-name-ru').value.trim();
    const category = document.getElementById('mat-field-category').value;
    const unit = document.getElementById('mat-field-unit').value;
    const pricePerUnit = parseNumberInput(document.getElementById('mat-field-price').value, NaN);
    const defaultWastePercent = parseNumberInput(document.getElementById('mat-field-waste').value, 0);

    if (!nameUz) {
      showToast("Xomashyo nomini kiriting!", "warning");
      return;
    }

    if (isNaN(pricePerUnit) || pricePerUnit < 0) {
      showToast("Narx 0 yoki undan katta bo'lishi kerak!", "warning");
      return;
    }

    if (isNaN(defaultWastePercent) || defaultWastePercent < 0 || defaultWastePercent >= 100) {
      showToast("Chiqindi foizi 0 va 99.9 oralig'ida bo'lishi kerak!", "warning");
      return;
    }

    if (id) {
      const mat = State.materials.find(m => m.id === id);
      if (mat) {
        mat.nameUz = nameUz;
        mat.nameRu = nameRu;
        mat.category = category;
        mat.unit = unit;
        mat.pricePerUnit = pricePerUnit;
        mat.defaultWastePercent = defaultWastePercent;
        showToast(`"${nameUz}" ma'lumotlari yangilandi!`, "success");
      }
      populateIngredientModalSelect(id);
      const rbSelect = document.getElementById('rb-add-material-select');
      if (rbSelect) {
        const curVal = rbSelect.value;
        rbSelect.innerHTML = '';
        State.materials.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = `${m.nameUz} (${m.unit || 'kg'} - ${formatMoney(m.pricePerUnit)})`;
          rbSelect.appendChild(opt);
        });
        rbSelect.value = curVal;
      }
    } else {
      const newId = 'mat_custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      State.materials.push({
        id: newId,
        nameUz,
        nameRu,
        category,
        unit,
        pricePerUnit,
        defaultWastePercent
      });
      showToast(`Yangi xomashyo "${nameUz}" qo'shildi!`, "success");

      // Recipe Builder va Ingredient modalidagi selectlarni yangilash
      const rbSelect = document.getElementById('rb-add-material-select');
      if (rbSelect) {
        const opt = document.createElement('option');
        opt.value = newId;
        opt.textContent = `${nameUz} (${unit} - ${formatMoney(pricePerUnit)})`;
        rbSelect.appendChild(opt);
        rbSelect.value = newId;
        const wasteInput = document.getElementById('rb-add-waste-input');
        if (wasteInput) wasteInput.value = defaultWastePercent;
      }
      populateIngredientModalSelect(newId);
    }

    saveState();
    closeModal('modal-material');
    renderMaterialsTable();
    const calc = updateActiveCalculations();
    renderIngredientsTable(calc);
    renderCalculationsUI(calc);
  }

  function deleteMaterial(matId) {
    const mat = State.materials.find(m => m.id === matId);
    if (!mat) return;

    // Ushbu xomashyo biron-bir retseptda ishlatilayotganini tekshirish
    const usedInRecipes = State.recipes.filter(r => (r.ingredients || []).some(i => i.materialId === matId));
    if (usedInRecipes.length > 0) {
      showToast(`"${mat.nameUz}" ${usedInRecipes.length} ta retseptda ishlatilmoqda! Uni o'chirishdan oldin retseptlardan olib tashlang.`, "warning", 5000);
      return;
    }

    confirmDialog("Xomashyoni o'chirish", `Haqiqatan ham "${mat.nameUz}" xomashyosini bazadan butunlay o'chirmoqchimisiz?`, () => {
      State.materials = State.materials.filter(m => m.id !== matId);
      saveState();
      renderMaterialsTable();
      populateIngredientModalSelect();
      const calc = updateActiveCalculations();
      renderIngredientsTable(calc);
      renderCalculationsUI(calc);
      showToast(`"${mat.nameUz}" bazadan o'chirildi`, "info");
    });
  }

  // --- RETSEPTGA TEZKOR INGREDIENT QO'SHISH (Modal 2) ---
  function populateIngredientModalSelect(selectedId = null) {
    const select = document.getElementById('ingredient-select-material');
    if (!select) return;

    select.innerHTML = '';

    // Yuqorida yangi xomashyo yaratish opsiyasi
    const optNew = document.createElement('option');
    optNew.value = '__NEW__';
    optNew.textContent = "➕ Yangi xomashyo kiritish (ro'yxatda bo'lmasa)...";
    optNew.className = "font-bold text-emerald-700 bg-emerald-50";
    select.appendChild(optNew);

    const catLabels = {
      vegetables: "Sabzavotlar va ko'katlar",
      spices_sauces: "Ziravorlar, yog' va souslar",
      dry_goods: "Quruq va kraxmalli mahsulotlar",
      packaging: "Qadoqlash va tara"
    };

    const categories = ['vegetables', 'spices_sauces', 'dry_goods', 'packaging'];
    categories.forEach(cat => {
      const mats = State.materials.filter(m => m.category === cat);
      if (mats.length > 0) {
        const group = document.createElement('optgroup');
        group.label = `--- ${catLabels[cat] || cat} ---`;
        mats.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = `${m.nameUz} (${m.unit || 'kg'} - ${formatMoney(m.pricePerUnit)})`;
          group.appendChild(opt);
        });
        select.appendChild(group);
      }
    });

    const others = State.materials.filter(m => !categories.includes(m.category));
    if (others.length > 0) {
      const group = document.createElement('optgroup');
      group.label = "--- Boshqa xomashyolar ---";
      others.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.nameUz} (${m.unit || 'kg'} - ${formatMoney(m.pricePerUnit)})`;
        group.appendChild(opt);
      });
      select.appendChild(group);
    }

    if (selectedId) {
      select.value = selectedId;
    } else if (State.materials.length > 0) {
      select.value = State.materials[0].id;
    }

    const currentMat = State.materials.find(m => m.id === select.value);
    if (currentMat) {
      const badge = document.getElementById('ingredient-unit-badge');
      if (badge) badge.textContent = currentMat.unit || 'kg';
      const wasteInput = document.getElementById('ingredient-input-waste');
      if (wasteInput) wasteInput.value = currentMat.defaultWastePercent || 0;
    }
  }

  function openAddIngredientModal() {
    populateIngredientModalSelect();
    const quickPanel = document.getElementById('quick-material-panel');
    if (quickPanel) quickPanel.classList.add('hidden');

    document.getElementById('ingredient-input-netto').value = '';
    document.getElementById('ingredient-calc-brutto').textContent = '0 kg';
    document.getElementById('ingredient-calc-price').textContent = '0 so\'m';
    document.getElementById('ingredient-calc-total').textContent = '0 so\'m';

    openModal('modal-ingredient');
  }

  function saveIngredientToRecipe() {
    const matSelect = document.getElementById('ingredient-select-material');
    let matId = matSelect ? matSelect.value : '';
    const nettoInput = parseNumberInput(document.getElementById('ingredient-input-netto').value, NaN);
    let wastePercent = parseNumberInput(document.getElementById('ingredient-input-waste').value, 0);

    const quickPanel = document.getElementById('quick-material-panel');
    const quickMatNameInput = document.getElementById('quick-mat-name');
    const quickMatPriceInput = document.getElementById('quick-mat-price');
    const quickName = (quickMatNameInput ? quickMatNameInput.value : '').trim();
    const isQuickPanelVisible = quickPanel && !quickPanel.classList.contains('hidden');

    // Agar '__NEW__' tanlangan bo'lsa yoki tezkor xomashyo paneli ochiq bo'lib nom kiritilgan bo'lsa
    if (matId === '__NEW__' || (isQuickPanelVisible && quickName.length > 0)) {
      if (!quickName) {
        showToast("Xomashyo nomini kiriting!", "warning");
        if (quickMatNameInput) quickMatNameInput.focus();
        return;
      }

      const quickPrice = parseNumberInput(quickMatPriceInput ? quickMatPriceInput.value : '', NaN);
      if (isNaN(quickPrice) || quickPrice < 0) {
        showToast("Xomashyo narxini to'g'ri kiriting!", "warning");
        if (quickMatPriceInput) quickMatPriceInput.focus();
        return;
      }

      const quickUnit = (document.getElementById('quick-mat-unit') && document.getElementById('quick-mat-unit').value) || 'kg';
      const quickWaste = parseNumberInput(document.getElementById('quick-mat-waste') ? document.getElementById('quick-mat-waste').value : '0', 0);

      if (isNaN(quickWaste) || quickWaste < 0 || quickWaste >= 100) {
        showToast("Chiqindi foizi 0 va 99.9 oralig'ida bo'lishi kerak!", "warning");
        const quickWasteEl = document.getElementById('quick-mat-waste');
        if (quickWasteEl) quickWasteEl.focus();
        return;
      }

      const newMatId = 'mat_custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const newMat = {
        id: newMatId,
        nameUz: quickName,
        nameRu: '',
        category: 'vegetables',
        unit: quickUnit,
        pricePerUnit: quickPrice,
        defaultWastePercent: quickWaste
      };

      State.materials.push(newMat);
      saveState();

      // Dropdownlarni yangilash va yangi xomashyoni tanlash
      populateIngredientModalSelect(newMatId);
      const rbSelect = document.getElementById('rb-add-material-select');
      if (rbSelect) {
        const opt = document.createElement('option');
        opt.value = newMatId;
        opt.textContent = `${quickName} (${quickUnit} - ${formatMoney(quickPrice)})`;
        rbSelect.appendChild(opt);
      }
      renderMaterialsTable();

      // Formani tozalash va panelni yashirish
      if (quickMatNameInput) quickMatNameInput.value = '';
      if (quickMatPriceInput) quickMatPriceInput.value = '';
      if (quickPanel) quickPanel.classList.add('hidden');

      matId = newMatId;
      if (matSelect) matSelect.value = newMatId;

      // Quick panel chiqindi foizini retsept hisobiga va inputga bog'lash
      wastePercent = quickWaste;
      const ingWasteEl = document.getElementById('ingredient-input-waste');
      if (ingWasteEl) ingWasteEl.value = quickWaste;
    }

    if (isNaN(nettoInput) || nettoInput <= 0) {
      showToast("Netto miqdorini to'g'ri kiriting!", "warning");
      const nettoEl = document.getElementById('ingredient-input-netto');
      if (nettoEl) nettoEl.focus();
      return;
    }

    // Xomashyoni tekshirish
    const mat = State.materials.find(m => m.id === matId);
    if (!mat) {
      showToast("Xomashyoni tanlang yoki yangi xomashyo kiriting!", "warning");
      return;
    }

    // Faol retseptni olish yoki katalog bo'sh bo'lsa yangisini yaratish
    let recipe = getActiveRecipe();
    if (!recipe) {
      const newRecipeId = 'recipe_init_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      recipe = {
        id: newRecipeId,
        code: 'REC-01',
        nameUz: "Yangi Koreys Salati",
        nameRu: "Новый корейский салат",
        category: "Sabzavotli",
        batchOutputKg: State.batchKg || 10.0,
        defaultMarkupPercent: State.markupPercent || 40.0,
        shelfLifeDays: 10,
        descriptionUz: "Yangi retsept",
        instructions: "",
        ingredients: [],
        operationalCosts: {
          laborPerKg: 2000,
          utilitiesPerKg: 500,
          transportPerKg: 500,
          depreciationPerKg: 200,
          overheadPerKg: 300
        },
        packagingConfig: {
          portionSizeKg: 0.50,
          defaultType: 'container_500g',
          containerMaterialId: 'mat_pack_500g',
          containerUnitCost: 900,
          labelUnitCost: 200,
          includeLabel: true
        }
      };
      State.recipes.push(recipe);
      State.activeRecipeId = newRecipeId;
      saveState();
      renderRecipeDropdown();
      renderActiveRecipeMetaInputs();
    }

    if (!recipe.ingredients) recipe.ingredients = [];

    const scale = (State.batchKg || 10.0) / (recipe.batchOutputKg || 10.0);
    const baseNetto = nettoInput / scale;
    const wp = Math.max(0, Math.min(99.9, wastePercent));
    const baseGross = baseNetto / (1 - wp / 100);

    recipe.ingredients.push({
      materialId: mat.id,
      nameUz: mat.nameUz,
      nameRu: mat.nameRu || '',
      grossWeight: Number(baseGross.toFixed(4)),
      wastePercent: wp,
      netWeight: Number(baseNetto.toFixed(4)),
      unit: mat.unit || 'kg',
      unitPrice: mat.pricePerUnit || 0,
      notes: ""
    });

    saveState();
    closeModal('modal-ingredient');
    const calc = updateActiveCalculations();
    renderIngredientsTable(calc);
    renderCalculationsUI(calc);
    showToast(`"${mat.nameUz}" retseptga qo'shildi!`, "success");
  }

  // ==========================================================================
  // 17. DASTURNI ISHGA TUSHIRISH (BOOTSTRAP)
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    initData();
    initEventListeners();
    renderAll();
  });

  // Global eksport (tekshiruv yoki tashqi testlar uchun)
  window.KoreanSaladApp = {
    State,
    STORAGE_KEYS,
    initData,
    saveState,
    RecipeBuilder,
    SalatAIAgent,
    calculateRecipe,
    updateActiveCalculations,
    exportToCSV,
    printTexkarta,
    resetToDefaults
  };

})();
