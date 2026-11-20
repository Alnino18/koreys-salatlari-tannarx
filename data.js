/**
 * Koreys Salatlari Tannarx Kalkulyatori (Себестоимость корейских салатов)
 * Ma'lumotlar bazasi, Texnologik xaritalar katalogi va AI Bilimlar Bazasi (data.js)
 * 
 * Valyuta: O'zbekiston so'mi (UZS)
 * Barcha narxlar va me'yorlar O'zbekiston (Toshkent ulgurji bozorlari) standartlariga moslangan.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AppCatalog = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // =========================================================================
  // 1. ASOSIY METAMALUMOTLAR VA SOZLAMALAR
  // =========================================================================
  const APP_CONFIG = {
    appName: "Koreys Salatlari Tannarxi Kalkulyatori",
    appNameRu: "Калькулятор себестоимости корейских салатов",
    currency: "UZS",
    currencySymbol: "so'm",
    currencyShort: "so'm",
    locale: "uz-UZ",
    defaultBatchWeightKg: 10.0,
    defaultMarkupPercent: 40.0,
    version: "2.0.0"
  };

  // =========================================================================
  // 2. XOMASHYO TOIFALARI (Категории сырья)
  // =========================================================================
  const RAW_MATERIAL_CATEGORIES = [
    { id: 'vegetables', nameUz: "Sabzavotlar va ko'katlar", nameRu: "Овощи и зелень", icon: "carrot" },
    { id: 'spices_sauces', nameUz: "Ziravorlar, yog' va souslar", nameRu: "Специи, масло и соусы", icon: "flame" },
    { id: 'dry_goods', nameUz: "Quruq, go'sht va kraxmalli mahsulotlar", nameRu: "Сухие, мясные и соевые продукты", icon: "box" },
    { id: 'packaging', nameUz: "Qadoqlash va tara materiallari", nameRu: "Упаковка и тара", icon: "package" }
  ];

  // =========================================================================
  // 3. EGRI VA QO'SHIMCHA XARAJATLAR TOIFALARI (Категории косвенных расходов)
  // =========================================================================
  const EXPENSE_CATEGORIES = [
    {
      id: 'labor',
      code: 'ISH_HAQI',
      nameUz: "Ish haqi va mehnat (ishbay)",
      nameRu: "Оплата труда (сдельщина)",
      defaultPerKg: 2000,
      unit: "so'm/kg",
      description: "Salat tayyorlovchi usta va tozalovchilarning 1 kg tayyor mahsulotga mehnati"
    },
    {
      id: 'utilities',
      code: 'KOMMUNAL',
      nameUz: "Elektr, gaz va suv (Kommunal)",
      nameRu: "Коммунальные услуги (свет, газ, вода)",
      defaultPerKg: 500,
      unit: "so'm/kg",
      description: "Qovurish, qaynatish, sovutgich va yuvish xarajatlari"
    },
    {
      id: 'depreciation',
      code: 'AMORTIZATSIYA',
      nameUz: "Uskunalar amortizatsiyasi",
      nameRu: "Амортизация оборудования",
      defaultPerKg: 200,
      unit: "so'm/kg",
      description: "Qirg'ichlar, pichoqlar, qozonlar, vakuum apparati eskirishi"
    },
    {
      id: 'transport',
      code: 'TRANSPORT',
      nameUz: "Transport va logistika",
      nameRu: "Транспорт и доставка",
      defaultPerKg: 500,
      unit: "so'm/kg",
      description: "Bozordan xomashyo keltirish va savdo nuqtalariga yetkazish"
    },
    {
      id: 'overhead',
      code: 'USTAMA',
      nameUz: "Doimiy va ma'muriy ustama",
      nameRu: "Накладные и административные расходы",
      defaultPerKg: 300,
      unit: "so'm/kg",
      description: "Sex ijarasi, sanitariya vositalari, hisobchilik va kutilmagan yo'qotishlar"
    }
  ];

  // =========================================================================
  // 4. XOMASHYO VA MATERIALLARNING TO'LIQ BAZASI (Toshkent ulgurji bozor narxlari)
  // =========================================================================
  let DEFAULT_RAW_MATERIALS = [];

  // =========================================================================
  // 5. TEXNOLOGIK XARITALAR (Toza holat)
  // =========================================================================
  let DEFAULT_RECIPES = [];

  // =========================================================================
  // 6. AI BILIMLAR BAZASI (AI_KNOWLEDGE_BASE)
  // =========================================================================
  const AI_KNOWLEDGE_BASE = {
    metadata: {
      agentName: "Salat Texnolog AI",
      titleUz: "Koreys Salatlari Bosh Texnologi va Iqtisodiy Maslahatchisi",
      titleRu: "Главный технолог и экономист корейских салатов",
      version: "2.0.0",
      description: "100% offline ishlovchi, O'zbekiston bozor standartlari va an'anaviy koreys-sibir texnologiyasiga asoslangan sun'iy intellekt bilimlari bazasi."
    },

    // Tezkor savol tugmalari (UI chips)
    quickPrompts: [
      { id: 'cost_cut', label: "💡 Tannarxni qanday arzonlashtirish mumkin?", query: "tannarxni sifatni yo'qotmasdan arzonlashtirish sirlari" },
      { id: 'new_grib', label: "🍄 Qo'ziqorinli yangi salat tuzib ber", query: "qo'ziqorinli yangi salat retsepti va texnologiyasi" },
      { id: 'new_kamdi', label: "🥔 Qarsildoq Kamdi-cha (kartoshka)", query: "kamdicha kartoshkali salat sirlari va retsepti" },
      { id: 'new_he', label: "🥩 Mol go'shtli haqiqiy He salati", query: "mol go'shtli He salati retsepti va sirlari" },
      { id: 'water_leak', label: "⚠️ Salat suv berib yuborsa nima qilish kerak?", query: "salat ko'p suv berib yuborishi sababi va yechimi" },
      { id: 'carrot_soft', label: "🥕 Morkovchada sabzi yumshab qolishi", query: "sabzi nega yumshab qoladi qarsildoq qilish sirlari" },
      { id: 'kimchi_secrets', label: "🌶️ Kimchi tayyorlash va fermentatsiya sirlari", query: "kimchi tayyorlash sirlari va xatolari" }
    ],

    // 1. Texnologik sirlar va ishlab chiqarish standartlari
    technologies: [
      {
        id: "morkovcha",
        nameUz: "Koreyscha sabzi salat (Morkovcha)",
        category: "Sabzavotli",
        secrets: [
          "Sabzini uzun somoncha qilib maxsus o'tkir qirg'ichda qirish kerak. Qirg'ich o'tmas bo'lsa, sabzi ezilib suvini yo'qotadi va yumshab qoladi.",
          "Tuz va shakar sepib 10-15 daqiqa kutiladi, yengil bosiladi (lekin qattiq siqib ezilmaydi). Chiqqan ortiqcha achchiq suv to'kiladi.",
          "Eng asosiy sir: qizdirilgan yog' bevosita sabzining ustiga emas, qovurilgan piyoz va maydalangan kashnich urug'i (koriandr) hamda qizil achchiq qalampir ustiga quyiladi. Shunda ziravorlar kuymasdan xushbo'y efir moylarini ajratadi.",
          "70% sirka kislotasi salat yaxshilab sovugandan keyin yoki qizigan yog' quyilgach aralashtiriladi. Issiq sabziga sirka quyilsa, hid tez uchib ketadi."
        ],
        wastePercentRange: "10% - 15%",
        idealStorage: "+2°C dan +6°C gacha sovutgichda, 14 kungacha sifatini yo'qotmaydi."
      },
      {
        id: "funchoza",
        nameUz: "Funchoza salati",
        category: "Lapshali",
        secrets: [
          "Funchozani hech qachon uzoq qaynatmang! Qaynagan suvda 5-7 daqiqa dimlanadi, so'ng muzdek oqova suvda darhol chayiladi va durshlagda yaxshilab sirqitiladi.",
          "Bodring va bulg'or qalampiri o'ta yupqa somoncha qilinadi. Bodringni funchozaga qo'shishdan oldin ozgina tuzlab, 10 daqiqadan so'ng ajralgan suvini yengil siqib tashlash shart, aks holda salat 1 kunda suvga aylanadi.",
          "Funchoza o'ziga yog' va sousni juda ko'p shimadi. Shu sababli so'ya sousi va ziravorli yog' aralashmasini funchoza hali sovuq va quruq paytida quyib aralashtirish tavsiya etiladi.",
          "Bo'kish koeffitsiyenti: 1 kg quruq funchozadan ~3.1 kg tayyor lapsha olinadi. Bu tannarxni juda foydali qiladi."
        ],
        wastePercentRange: "Sabzavotlar 7-10%, funchoza 0%",
        idealStorage: "+2°C dan +5°C gacha sovutgichda 5 kungacha."
      },
      {
        id: "kimchi",
        nameUz: "Kimchi (koreyscha karom)",
        category: "Fermentatsiyalangan",
        secrets: [
          "Pekin karomi bo'ylama 2 yoki 4 qismga bo'linib, har bir bargi orasiga tuz sepiladi va 4-6 soatga og'ir yuk ostiga tuzlashga qo'yiladi.",
          "Tuzlangan karom sovuq suvda 2-3 marta chayiladi, aks holda kimchi haddan tashqari sho'r bo'ladi. So'ng suvi 1-2 soat davomida to'liq oqiziladi.",
          "Yangnyeom (achchiq sous bo'tqasi): qaynatilgan guruch unining yengil kiseliga qizil Kochukaru qalampiri, ko'p miqdorda sarimsoq, zanjabil, baliq yoki so'ya sousi, ozroq shakar va daykon somonchasi aralashtiriladi.",
          "Fermentatsiya: 1 sutka xona haroratida (18-20°C) qoldirilib, gaz pufakchalari chiqa boshlagach, zudlik bilan +1..+3°C sovutgichga o'tkaziladi. Sovuqda u 2-3 oy mobaynida yanada shirinlashib boradi."
        ],
        wastePercentRange: "15% - 20% (qattiq tashqi barglar va o'zak)",
        idealStorage: "+0°C dan +4°C gacha sovutgichda 45-60 kun."
      },
      {
        id: "baqlajon",
        nameUz: "Baqlajon salati (Baqlajon-cha)",
        category: "Sabzavotli",
        secrets: [
          "Baqlajon po'stlog'i archilmaydi, bo'ylama qalin somoncha (1x5 sm) qilib to'g'raladi. Ko'p tuz sepib 20 daqiqa qo'yiladi va qora achchiq suvi yaxshilab siqib olinadi.",
          "Qovurish usuli: baqlajonni o'ta ko'p yog'da pishirib yubormaslik kerak! Kuchli olovda qizigan yog'da 3-4 daqiqa qarsildoq qilib yengil qovuriladi yoki 5 daqiqa bug'da (mantipazda) ushlab pishirib olinadi.",
          "Yangi bolgar qalampiri, yangi sarimsoq, ko'p kinza ko'kati va qovurilgan piyozli yog' quyiladi. Baqlajon o'ziga sousni juda tez singdiradi."
        ],
        wastePercentRange: "10% - 14%",
        idealStorage: "+2°C dan +6°C da 10 kun."
      },
      {
        id: "fuju",
        nameUz: "Fuju / Spargel salati",
        category: "Dukkakli soya",
        secrets: [
          "Quruq fujuni hech qachon qaynoq suvda ivitmang! Qaynoq suvda fuju usti ezilib pishib ketadi, ichi esa qattiq qoladi. To'g'ri usul: xona haroratidagi sovuq suvda 3-4 soat (yoki kechasi bilan) ivitish.",
          "Ivitilgandan so'ng fuju qalin dastro'molda yoki qo'lda siqib, ortiqcha suvdan tozalanishi shart. Aks holda u sousni o'ziga olmaydi va bemaza bo'ladi.",
          "Fuju 4 sm bo'laklarga kesiladi, unga yupqa sabzi somonchasi, sarimsoq, so'ya sousi va issiq xushbo'y yog' quyiladi.",
          "Bo'kish koeffitsiyenti: 1 kg quruq fujudan ~2.6 kg bo'kkan fuju chiqadi."
        ],
        wastePercentRange: "Quruq fuju 0%, sabzi 12%",
        idealStorage: "+2°C dan +5°C da 7 kun."
      },
      {
        id: "bodringcha",
        nameUz: "Bodring-cha (Oi-muchim)",
        category: "Sabzavotli",
        secrets: [
          "Bodringlar qiya tilim yoki 4 ga bo'linib urug' qismi o'rtacha bo'lgan qarsildoq navlar tanlanadi.",
          "Bodringni kesib darhol tuz sepiladi va 15 daqiqadan so'ng chiqqan suv qat'iy to'kib tashlanadi.",
          "Qaynoq yog'da qizdirilgan qizil qalampir, sarimsoq, kashnich, so'ya sousi va bir tomchi uksus qo'shiladi. Kunjut bilan bezatiladi."
        ],
        wastePercentRange: "5% - 8%",
        idealStorage: "+2°C dan +6°C da 4-5 kun."
      },
      {
        id: "kamdicha",
        nameUz: "Kamdi-cha (qarsildoq kartoshkali koreys salati)",
        category: "Kraxmalli",
        secrets: [
          "Kartoshka maxsus koreys qirg'ichidan uzun ingichka somoncha qilib chiqariladi.",
          "Eng muhim qoida: qirg'ichlangan kartoshka kraxmalidan to'liq xalos bo'lish uchun sovuq suvda 3-4 marta chayiladi!",
          "Blanshirlash (chala pishirish): qaynayotgan sho'r va 1 osh qoshiq sirka qo'shilgan suvga solinib, qat'iy 1.5 - 2 daqiqa qaynatiladi. Kartoshka pishib ezilmasligi, balki qarsildoq (al dente) qolishi shart!",
          "Darhol muzdek suvga olinadi, yaxshilab quritiladi, so'ng qovurilgan piyoz, sarimsoq, go'sht yoki qizil yog' bilan aralashtiriladi."
        ],
        wastePercentRange: "12% - 16%",
        idealStorage: "+2°C dan +5°C da 5 kun."
      },
      {
        id: "qoziqorincha",
        nameUz: "Qo'ziqorin-cha (Grib-cha)",
        category: "Qo'ziqorinli",
        secrets: [
          "Yangi oq shampinyonlar yupqa parrak qilib to'g'raladi va qaynayotgan suvda 3-4 daqiqa yengil qaynatib olinadi yoki kuchli olovda ozgina yog'da 4 daqiqa qovuriladi.",
          "Sabzi somonchasi, shirin bolgar qalampiri, sarimsoq, kashnich urug'i, so'ya sousi va ozgina sirka qo'shiladi.",
          "Qo'ziqorin o'zidan suyuqlik ajratmasligi uchun qovurishdan keyin ortiqcha sharbati olib tashlanadi."
        ],
        wastePercentRange: "5% - 7%",
        idealStorage: "+2°C dan +5°C da 7 kun."
      },
      {
        id: "he_goshtli",
        nameUz: "Go'shtli He salati (Klassik Mol go'shtli He)",
        category: "Go'shtli",
        secrets: [
          "Mol go'shti (lahm) muzlatgichda yarim muzlatilgan holatda o'tkir pichoq bilan o'ta yupqa somoncha qilib to'g'raladi (muzdek go'sht tekis va yupqa kesiladi).",
          "Go'sht 70% sirka essensiyasida (1 kg go'shtga 1.5-2 osh qoshiq) yoki limon sharbatida kamida 2-3 soat marinadlanadi. Sirka go'sht oqsilini pishiradi (denaturatsiya qiladi).",
          "Alohida tovada piyoz ko'p yog'da tillarang bo'lguncha qovuriladi va issiq yog'i bilan go'sht ustiga quyiladi.",
          "Yupqa somoncha qilingan bodring, sabzi, sarimsoq, kinza ko'kati va so'ya sousi qo'shib aralashtiriladi."
        ],
        wastePercentRange: "Go'sht tozalash 7-10%",
        idealStorage: "+1°C dan +4°C da 7-10 kun."
      }
    ],

    // 2. Chiqindi me'yorlari (Tozalash va mexanik ishlovdagi yo'qotishlar)
    wasteStandards: [
      {
        rawMaterial: "Sabzi (toza qizil)",
        standardPercent: 12.0,
        rangePercent: "10% - 15%",
        explanationUz: "Qora va loylarini yuvish, po'stlog'ini pichoq yoki qirg'ichda qirish, bosh va dum qismlarini kesish yo'qotishi.",
        formula: "Netto = Brutto * 0.88; Brutto = Netto / 0.88"
      },
      {
        rawMaterial: "Piyoz (bosh piyoz)",
        standardPercent: 10.0,
        rangePercent: "8% - 12%",
        explanationUz: "Quruq tashqi qobiqlarni archish va ildiz asosini kesish.",
        formula: "Netto = Brutto * 0.90"
      },
      {
        rawMaterial: "Sarimsoq (Chesnok)",
        standardPercent: 8.5,
        rangePercent: "7% - 10%",
        explanationUz: "Boshini bo'laklarga ajratish va quruq qobiqlarini archish.",
        formula: "Netto = Brutto * 0.915"
      },
      {
        rawMaterial: "Bodring (yangi)",
        standardPercent: 7.0,
        rangePercent: "5% - 8%",
        explanationUz: "Ikki chekka dumlarini kesish va sifatsiz joylarini olib tashlash.",
        formula: "Netto = Brutto * 0.93"
      },
      {
        rawMaterial: "Baqlajon",
        standardPercent: 12.0,
        rangePercent: "10% - 15%",
        explanationUz: "Yashil bandini kesish, zararlangan joylarini tozalash va achchiq suvini siqishdagi vazn yo'qotish.",
        formula: "Netto = Brutto * 0.88"
      },
      {
        rawMaterial: "Pekin karomi",
        standardPercent: 15.0,
        rangePercent: "14% - 20%",
        explanationUz: "Tashqi chang va so'ligan 2-3 qavat barglarini ajratish, pastki yog'ochsimon o'zagini kesish.",
        formula: "Netto = Brutto * 0.85"
      },
      {
        rawMaterial: "Bolgar qalampiri",
        standardPercent: 10.0,
        rangePercent: "9% - 13%",
        explanationUz: "Bandi, urug'don qismi va ichki oq pardalarini olib tashlash.",
        formula: "Netto = Brutto * 0.90"
      },
      {
        rawMaterial: "Kartoshka (Kamdi-cha)",
        standardPercent: 14.0,
        rangePercent: "12% - 16%",
        explanationUz: "Po'stlog'ini archish, ko'zchalarini o'yish va kraxmal chayishdagi mayda qirindilar.",
        formula: "Netto = Brutto * 0.86"
      },
      {
        rawMaterial: "Qo'ziqorin (Shampinyon)",
        standardPercent: 6.0,
        rangePercent: "5% - 8%",
        explanationUz: "Ildiz qismining qumli kesimi va yengil artishdagi yo'qotish.",
        formula: "Netto = Brutto * 0.94"
      },
      {
        rawMaterial: "Mol go'shti (lahm)",
        standardPercent: 8.0,
        rangePercent: "6% - 10%",
        explanationUz: "Ortiqcha qattiq yog'lar, paylar va ustki pardalarni tozalash.",
        formula: "Netto = Brutto * 0.92"
      }
    ],

    // 3. Tannarxni sifatni yo'qotmasdan arzonlashtirish sirlari
    costOptimization: [
      {
        id: "aromatic_oil",
        titleUz: "Ziravorli xushbo'y yog' texnologiyasi (Ziravorlarni 30% tejash)",
        titleRu: "Ароматизация масла (экономия специй на 30%)",
        descriptionUz: "Maydalangan koriandr va qalampirni quruq sabzavot ustiga sochib yuborish o'rniga, tovadagi 150-160°C qizigan pista yog'iga piyoz bilan birga 10-15 soniya solib qizdirilsa, efir moylari yog'ga 100% o'tadi. Natijada 30% kamroq qimmatbaho ziravor ishlatib, 2 barobar kuchliroq hid va ta'mga erishiladi.",
        savingsPercent: "20-30% ziravorlar tejaladi"
      },
      {
        id: "swelling_ratio",
        titleUz: "Quruq xomashyolarning bo'kish koeffitsiyentidan to'liq foydalanish",
        titleRu: "Коэффициент набухания фунчозы и спаржи",
        descriptionUz: "1 kg quruq Funchoza (45,000 so'm) to'g'ri ivitilganda 3.1 kg tayyor lapshaga aylanadi (1 kg tayyor funchoza tannarxi bor-yo'g'i ~14,500 so'mga tushadi!). 1 kg Fuju (60,000 so'm) ivitilganda 2.6 kg bo'ladi (~23,000 so'm/kg). Quruq mahsulotlarni to'g'ri sovuq suvda ivitish orqali eng yuqori chiqish koeffitsiyentiga erishiladi.",
        savingsPercent: "Tannarxni 2.5 - 3 barobar pasaytiradi"
      },
      {
        id: "wholesale_sourcing",
        titleUz: "Toshkent ulgurji bozorlarida to'g'ri xarid qilish (Qo'yliq / Chorsu)",
        titleRu: "Секреты оптовых закупок на рынках Ташкента",
        descriptionUz: "Sabzavotlarni do'kondan emas, tonggi 04:30 - 06:00 oralig'ida Qo'yliq yoki Chorsu ulgurji qatoridan qoplab xarid qilish narxni 25-35% ga arzonlashtiradi. Masalan, sabzini chakana 5,500 so'm o'rniga qopda 3,500-4,000 so'mdan, piyozni 2,200-2,500 so'mdan olish mumkin.",
        savingsPercent: "25-35% xomashyo tejamkorligi"
      },
      {
        id: "water_extraction",
        titleUz: "Ortiqcha suyuqlikni chiqarib sous sarfini kamaytirish",
        titleRu: "Предварительная засолка для экономии соусов",
        descriptionUz: "Sabzavotlarni oldindan yengil tuzlab, o'zining erkin suvini chiqarib tashlash orqali sous, yog' va sirka suyulib ketishining oldi olinadi. Salat zich bo'ladi va qimmatbaho souslar (so'ya sousi, yog', kashnich) miqdori kamroq talab etiladi.",
        savingsPercent: "15% sous va yog' tejamkorligi"
      },
      {
        id: "packaging_bulk",
        titleUz: "Qadoqlash formatini optimallashtirish",
        titleRu: "Оптимизация упаковки (1 кг контейнеры и вакуум)",
        descriptionUz: "250g lik idishda 10 kg mahsulot sotish uchun 40 ta konteyner va 40 ta nakleyka kerak bo'ladi (40 x 1,000 = 40,000 so'm). Agar 1 kg lik konteyner yoki vakuum paketga o'tilsa, 10 dona x 1,500 = 15,000 so'm sarflanadi. Qadoq xarajati 62% ga kamayadi!",
        savingsPercent: "Qadoqda 60% gacha tejamkorlik"
      }
    ],

    // 4. Muammolarni bartaraf etish (Troubleshooting)
    troubleshooting: [
      {
        id: "problem_water",
        problemUz: "Salat ko'p suv berib yuborishi (suvlanib ketishi)",
        problemRu: "Салат выделяет слишком много жидкости",
        causeUz: "Sabzi, bodring yoki karom avvaldan tuzlanib suvi to'kilmagan; sabzavotlar to'mtoq qirg'ichda qirilgan; salat issiq xonada saqlangan.",
        solutionUz: "1) Sabzavotlarni qirg'ichdan chiqargach, 10-15 daqiqa tuzlab qo'ying va chiqqan sharbatni yengil siqib to'kib tashlang. 2) Qirg'ich tig'larini muntazam charxlab turing (o'tkir tig' hujayralarni yormaydi). 3) Tayyor salatni zudlik bilan +2..+4°C sovutgichga qo'ying."
      },
      {
        id: "problem_sour_spoil",
        problemUz: "Salat muddatidan oldin achib, nordon bo'lib qolishi",
        problemRu: "Салат преждевременно закисает и портится",
        causeUz: "Sanitariya qoidalarining buzilishi; xomashyo yaxshi yuvilmagan; sirka (uksus) yetarli solinmagan; saqlash harorati +8°C dan yuqori bo'lgan.",
        solutionUz: "1) Sirka 70% me'yorini qat'iy saqlang (10 kg sabziga kamida 40-50 ml 70% essensiya). Sirka tabiiy konservant hisoblanadi. 2) Idishlar, pichoqlar va qo'llar oziq-ovqat spirti yoki xlorli eritmada dezinfeksiya qilinishi shart. 3) Salat haroratini doimo +2..+5°C da ushlang."
      },
      {
        id: "problem_soft_carrot",
        problemUz: "Morkovchada sabzi yumshab, shalvirab qolishi (qarsildoq emasligi)",
        problemRu: "Морковь становится мягкой и вялой, теряет хруст",
        causeUz: "Sabzining ustiga o'ta qaynoq (tutayotgan) yog' quyilgan va sabzi pishib ketgan; eski va suvsiz sabzi ishlatilgan; sabzi qo'lda qattiq g'ijimlangan.",
        solutionUz: "1) Qaynoq yog'ni hech qachon to'g'ridan-to'g'ri sabziga quymang! Yog'ni avval tovada piyoz va ziravorlar bilan 1-2 daqiqa tindirib (haroratini ~90-100°C ga tushirib), so'ng quyish kerak. 2) Faqat qattiq, shirali, toza qizil sabzi tanlang. 3) Sabzini tuzlaganda xamir kabi ezmang, faqat barmoq uchlari bilan yengil aralashtiring."
      },
      {
        id: "problem_too_salty",
        problemUz: "Salat sho'r bo'lib ketishi",
        problemRu: "Салат пересолен",
        causeUz: "Retseptdagi tuz me'yori oshirib yuborilgan yoki so'ya sousi sho'rligi hisobga olinmagan.",
        solutionUz: "1) Tezkor tuzatish: yangi qirg'ichlangan tuzsiz sabzi yoki qaynatilgan tuzsiz funchoza/fuju qo'shib massani ko'paytiring. 2) Bir oz shakar qumi va qo'shimcha o'simlik yog'i qo'shish sho'rlik sezgisini 25-30% ga yumshatadi. Hech qachon suv quyib yuvmang!"
      },
      {
        id: "problem_too_spicy",
        problemUz: "Salat haddan tashqari achchiq bo'lib qolishi",
        problemRu: "Салат получился слишком острым",
        causeUz: "Qizil qalampir yoki sarimsoq me'yordan ko'p solingan.",
        solutionUz: "1) Ozgina shakar va bir necha tomchi sirka (yoki limon sharbati) qo'shing. Nordon-shirin ta'm o'tkir achchiqlikni muvozanatlashtiradi. 2) Yangi sabzavotlar yoki bo'kkan funchoza aralashtiring."
      }
    ],

    // 5. Boy savol-javoblar bazasi (Semantic / Keyword QA Knowledge for Local AI Agent)
    qaKnowledge: [
      {
        keywords: ["arzonlashtirish", "tannarx", "iqtisod", "foyda", "tejamkorlik", "себестоимость", "дешевле", "экономия"],
        topic: "cost_reduction",
        questionUz: "Koreys salatlari tannarxini sifatni buzmasdan qanday arzonlashtirish mumkin?",
        answerUz: "Koreys salatlarida tannarxni sifatni yo'qotmasdan 15-25% ga kamaytirishning 5 ta oltin qoidasi mavjud:\n\n1. **Xushbo'y yog' texnologiyasi**: Qimmat ziravorlarni quruq sepmasdan, qizigan pista yog'iga piyoz bilan birga solib xushbo'ylang. Bu efir moylarini 100% ochadi va ziravor sarfini 30% tejaydi.\n2. **Bo'kish koeffitsiyenti**: Funchoza (1 kg -> 3.1 kg) va Fujuni (1 kg -> 2.6 kg) to'g'ri sovuq suvda iviting. Natijada eng qimmatli moddalar hajmi 3 barobar arzonlashadi.\n3. **Ulgurji bozorlar**: Sabzavotlarni Qo'yliq yoki Chorsu ulgurji bozoridan erta tongda (04:30-06:00) qoplab xarid qiling (25-35% arzonroq).\n4. **Oldindan tuzlab siqish**: Ortiqcha suvni chiqarib tashlash qimmat so'ya sousi va yog' sarfini 15% tejaydi.\n5. **1 kg yoki vakuum tara**: 250 grammlik idishlar o'rniga 1 kg konteyner yoki vakuum paketga o'tish qadoqlash xarajatlarini 60% ga kamaytiradi."
      },
      {
        keywords: ["suv", "oqib", "suyuqlik", "suvlanib", "жидкость", "вода", "течет"],
        topic: "water_release",
        questionUz: "Salat ko'p suv berib yuborishi sababi va uni bartaraf etish usuli qanday?",
        answerUz: "Salat suv berib yuborishining 3 ta asosiy sababi bor:\n\n1. **Oldindan tuzlab siqilmagani**: Sabzi, bodring yoki karom to'g'ralgach, ozroq tuz sepilib 10-15 daqiqa kutilishi, chiqqan achchiq sharbat yengil siqib to'kilishi shart.\n2. **Qirg'ich tig'ining o'tmasligi**: O'tmas tig' sabzavot to'qimalarini kesmaydi, balki ezib yuboradi. Natijada barcha sharbat tashqariga sizib chiqadi.\n3. **Issiq muhit**: Salat tayyor bo'lishi bilan zudlik bilan +2..+4°C sovutgichga qo'yilishi kerak. Xona haroratida tuz sabzavot hujayralaridan tinimsiz suv tortib chiqaradi."
      },
      {
        keywords: ["sabzi", "morkovcha", "yumshab", "qarsildoq", "морковь", "морковча", "хрустящая", "мягкая"],
        topic: "crispy_carrot",
        questionUz: "Morkovchada sabzi nima sababdan yumshab qoladi va qanday qilib qarsildoq qilish mumkin?",
        answerUz: "Morkovchaning qarsildoq bo'lishining bosh siri:\n\n1. **Yog' harorati**: Tovadagi tutayotgan qaynoq yog'ni sabzining ustiga to'g'ridan-to'g'ri quymang! Aks holda sabzi qovurilib pishadi va shalviraydi. Yog'ni avval piyoz va ziravor bilan qizdirib, olovdan olib 1 daqiqa tindiring, so'ng quying.\n2. **Xomashyo sifati**: Quruq, so'ligan yoki ichi yog'ochsimon oq sabzini ishlatmang. Shirali, yangi qizil sabzi kerak.\n3. **Ezmaslik**: Sabzini tuzlaganda xamir kabi ezib g'ijimlamang, faqat barmoqlar bilan havodek yengil aylantiring."
      },
      {
        keywords: ["kimchi", "chimchi", "fermentatsiya", "karom", "кимчи", "чимчи", "капуста"],
        topic: "kimchi_secrets",
        questionUz: "Haqiqiy koreyscha Kimchi tayyorlashning asosiy sirlari nimalardan iborat?",
        answerUz: "Haqiqiy Kimchi sirlari:\n\n1. **Barglar orasiga tuz**: Pekin karomi bo'linib, har bir qavatiga tuz surtiladi va 4-6 soat og'ir tosh bosib tuzlanadi. Keyin albatta 2 marta sovuq suvda chayilib, suvi 2 soat to'liq oqiziladi.\n2. **Yangnyeom bo'tqasi**: Qizil Kochukaru qalampiri, ko'p sarimsoq, zanjabil, baliq sousi (anchous sousi) va ozroq shakar daykon somonchasi bilan qoriladi.\n3. **Guruch kiselchasi**: Qaynatilgan yengil guruch uni kiselchasi sousning karom barglariga yopishib turishini va foydali laktobakteriyalar ko'payishini ta'minlaydi.\n4. **Harorat nazorati**: 24 soat xonada qoldirilib, keyin qat'iy +1..+3°C sovutgichga qo'yiladi."
      },
      {
        keywords: ["funchoza", "lapsha", "kraxmalli", "фунчоза", "лапша"],
        topic: "funchoza_tips",
        questionUz: "Funchoza salati tayyorlashda qanday texnologik qoidalarga rioya qilish kerak?",
        answerUz: "Funchoza tayyorlash qoidalari:\n\n1. **Qaynatmaslik**: Qaynagan suv quyib 5-7 daqiqa qopqoq ostida dimlanadi. Hech qachon gazda qaynashiga yo'l qo'ymang!\n2. **Muzdek suvda chayish**: Dimlangach, darhol muzdek suvda chayilib sirqitiladi, so'ng qaychi bilan 10-15 sm qilib qirqiladi.\n3. **Bodringni quritish**: Bodring somonchasini tuzlab, suvini siqib tashlab keyin qo'shing.\n4. **Bo'kish ko'rsatkichi**: 1 kg quruq funchozadan 3.1 kg tayyor massa chiqadi."
      },
      {
        keywords: ["fuju", "spargel", "soya", "фучжу", "спаржа"],
        topic: "fuju_tips",
        questionUz: "Fuju (soya spargeli) qanday ivitiladi va qanday salat tayyorlanadi?",
        answerUz: "Fuju sirlari:\n\n1. **Faqat sovuq suv**: Qaynoq suvda fuju pishib eziladi. Uni xona haroratidagi sovuq suvda 3-4 soat (yoki kechasi bilan) ivitish shart.\n2. **Yaxshilab siqish**: Ivitilgan cho'plar siqilib, ichidagi ortiqcha suv chiqariladi, shunda u yog' va so'ya sousini to'liq shimadi.\n3. **Bo'kish**: 1 kg quruq fuju ivitilganda 2.6 kg bo'ladi.\n4. **Ziravorlar**: Qizdirilgan pista yog'i, sarimsoq, so'ya sousi va kunjut eng asosiy ta'm beruvchilardir."
      },
      {
        keywords: ["qoziqorin", "shampinyon", "grib", "грибы", "шампиньоны"],
        topic: "mushroom_salad",
        questionUz: "Qo'ziqorinli koreyscha salat (Grib-cha) qanday tayyorlanadi?",
        answerUz: "Qo'ziqorin-cha retsepti:\n\nYangi shampinyonlar yupqa parrak qilinadi, qaynagan sho'r suvda 3-4 daqiqa pishirib olinadi yoki kuchli olovda yog'da qovuriladi. Sabzi somonchasi, sarimsoq, kinza, so'ya sousi, ozroq uksus va qizdirilgan yog' qo'shiladi. 10 kg partiya tannarxi taxminan 24,000 - 26,000 so'm/kg atrofida bo'ladi."
      },
      {
        keywords: ["kamdi", "kamdicha", "kartoshka", "картофель", "камдича"],
        topic: "potato_salad",
        questionUz: "Kamdi-cha (qarsildoq kartoshka salati) tayyorlash texnologiyasi qanday?",
        answerUz: "Kamdi-cha eng arzon va xaridorgir koreys salatlaridan biridir:\n\n1. Kartoshka koreys qirg'ichida somoncha qilinadi.\n2. **Kraxmalni yuvish**: Sovuq suvda 3 marta oppoq kraxmali ketguncha chayiladi.\n3. **Blanshirlash**: Qaynoq sho'r va 1 osh qoshiq sirka qo'shilgan suvda 1.5 - 2 daqiqa qarsildoq holida pishiriladi.\n4. Sovuq suvda sovutiladi, qovurilgan piyoz, sarimsoq va murchli yog' bilan aralashtiriladi."
      },
      {
        keywords: ["he", "xe", "gosht", "baliq", "хе", "мясо", "рыба"],
        topic: "he_salad",
        questionUz: "Koreyscha He (Go'shtli yoki Baliqli) salati qanday tayyorlanadi?",
        answerUz: "Klassik Go'shtli He:\n\n1. Mol go'shtining lahm qismi muzdek holda o'ta yupqa somoncha qilib kesiladi.\n2. 70% sirka kislotasida (yoki limon sharbatida) 2-3 soat marinadlanadi (sirka go'shtni pishiradi).\n3. Ko'p miqdorda piyoz qizigan yog'da tillarang qilib qovurilib, qaynoq yog'i go'sht ustiga quyiladi.\n4. Yangi bodring, sabzi somonchasi, sarimsoq, kinza va so'ya sousi aralashtiriladi."
      },
      {
        keywords: ["achib", "buzilish", "saqlash", "muddat", "скисает", "хранение", "срок"],
        topic: "shelf_life",
        questionUz: "Koreys salatlarining yaroqlilik muddatini qanday uzaytirish mumkin?",
        answerUz: "Saqlash muddatini uzaytirish choralari:\n\n1. **Harorat**: Qat'iy +2°C dan +4°C gacha sovutgichda saqlash.\n2. **Sirka kislotasi**: 70% essensiya me'yorini kamaytirmaslik (u tabiiy xavfsiz konservant).\n3. **Vakuum qadoq**: Vakuum paketda saqlash mahsulotning havo bilan aloqasini to'xtatadi va yaroqlilik muddatini 2-3 barobarga uzaytiradi (morkovcha 30 kungacha, kimchi 60 kungacha buzilmaydi).\n4. **Sanitariya**: Ishlatiladigan idish va qirg'ichlarni har kuni qaynoq suv va dezinfektor bilan yuvish."
      }
    ],

    // 6. Ilovaga 1-klik bilan qo'shiladigan yangi retsept shablonlari (Ready-to-import Recipe Templates)
    recipeTemplates: [
      // 1) Qo'ziqorinli koreyscha salat (Grib-cha)
      {
        id: 'recipe_qoziqorin',
        code: 'REC-06',
        nameUz: "Qo'ziqorinli koreyscha salat (Grib-cha)",
        nameRu: "Салат из шампиньонов по-корейски (Гриб-ча)",
        category: "Qo'ziqorinli",
        batchOutputKg: 10.0,
        portionSizesKg: [0.25, 0.5, 1.0],
        defaultMarkupPercent: 45.0,
        preparationTimeMin: 60,
        shelfLifeDays: 7,
        storageConditions: "+2°C dan +5°C gacha sovutgichda",
        descriptionUz: "Yangi qaynatilgan oq shampinyonlar, sabzi somonchasi, bulg'or qalampiri, sarimsoq, xushbo'y yog' va so'ya sousi bilan boyitilgan mayin salat.",
        descriptionRu: "Нежный деликатесный салат из бланшированных шампиньонов с хрустящей морковью, сладким перцем, чесноком и соевой заправкой.",
        
        ingredients: [
          {
            materialId: 'mat_qoziqorin',
            nameUz: "Qo'ziqorin (yangi Shampinyon)",
            nameRu: "Шампиньоны свежие",
            grossWeight: 7.50,
            wastePercent: 6.0,
            netWeight: 7.05,
            unit: 'kg',
            unitPrice: 28000,
            notes: "Yupqa parrak qilib to'g'ralgan, 3-4 daqiqa qaynoq suvda blanshirlangan"
          },
          {
            materialId: 'mat_sabzi',
            nameUz: "Sabzi (toza qizil)",
            nameRu: "Морковь свежая",
            grossWeight: 1.50,
            wastePercent: 12.0,
            netWeight: 1.32,
            unit: 'kg',
            unitPrice: 4000,
            notes: "Yupqa somoncha qirg'ichlangan"
          },
          {
            materialId: 'mat_bolgar',
            nameUz: "Bolgar qalampiri",
            nameRu: "Перец болгарский сладкий",
            grossWeight: 0.80,
            wastePercent: 10.0,
            netWeight: 0.72,
            unit: 'kg',
            unitPrice: 20000,
            notes: "Somoncha to'g'ralgan"
          },
          {
            materialId: 'mat_sarimsoq',
            nameUz: "Sarimsoq (Chesnok)",
            nameRu: "Чеснок свежий",
            grossWeight: 0.20,
            wastePercent: 8.5,
            netWeight: 0.183,
            unit: 'kg',
            unitPrice: 35000,
            notes: "Presslangan"
          },
          {
            materialId: 'mat_kinza',
            nameUz: "Kashnich ko'kati (Kinza)",
            nameRu: "Свежая кинза",
            grossWeight: 0.15,
            wastePercent: 10.0,
            netWeight: 0.135,
            unit: 'kg',
            unitPrice: 15000,
            notes: "Mayda to'g'ralgan"
          },
          {
            materialId: 'mat_yogi',
            nameUz: "O'simlik yog'i",
            nameRu: "Масло растительное",
            grossWeight: 0.45,
            wastePercent: 0.0,
            netWeight: 0.45,
            unit: 'litr',
            unitPrice: 16000,
            notes: "Qizdirib quyish uchun"
          },
          {
            materialId: 'mat_soya_sousi',
            nameUz: "So'ya sousi",
            nameRu: "Соевый соус",
            grossWeight: 0.25,
            wastePercent: 0.0,
            netWeight: 0.25,
            unit: 'litr',
            unitPrice: 22000,
            notes: "Umami ta'm manbai"
          },
          {
            materialId: 'mat_uksus70',
            nameUz: "Sirka kislotasi 70%",
            nameRu: "Уксусная эссенция 70%",
            grossWeight: 0.03,
            wastePercent: 0.0,
            netWeight: 0.03,
            unit: 'litr',
            unitPrice: 12000,
            notes: "Yengil marinad"
          },
          {
            materialId: 'mat_shakar',
            nameUz: "Shakar qumi",
            nameRu: "Сахар-песок",
            grossWeight: 0.10,
            wastePercent: 0.0,
            netWeight: 0.10,
            unit: 'kg',
            unitPrice: 12000,
            notes: "Ta'm muvozanati"
          },
          {
            materialId: 'mat_tuz',
            nameUz: "Osh tuzi",
            nameRu: "Соль пищевая",
            grossWeight: 0.12,
            wastePercent: 0.0,
            netWeight: 0.12,
            unit: 'kg',
            unitPrice: 3000,
            notes: "Tuzlash uchun"
          },
          {
            materialId: 'mat_kashnich_urug',
            nameUz: "Kashnich urug'i (Koriandr)",
            nameRu: "Семена кориандра молотые",
            grossWeight: 0.04,
            wastePercent: 0.0,
            netWeight: 0.04,
            unit: 'kg',
            unitPrice: 45000,
            notes: "Maydalangan"
          },
          {
            materialId: 'mat_qalampir_qizil',
            nameUz: "Qizil achchiq murch",
            nameRu: "Красный острый перец",
            grossWeight: 0.03,
            wastePercent: 0.0,
            netWeight: 0.03,
            unit: 'kg',
            unitPrice: 60000,
            notes: "Yengil achchiqlik"
          },
          {
            materialId: 'mat_kunjut',
            nameUz: "Kunjut urug'i",
            nameRu: "Семена кунжута белые",
            grossWeight: 0.04,
            wastePercent: 0.0,
            netWeight: 0.04,
            unit: 'kg',
            unitPrice: 40000,
            notes: "Qovurilgan kunjut"
          },
          {
            materialId: 'mat_ajinomoto',
            nameUz: "Glyutamat natriy",
            nameRu: "Глутамат натрия",
            grossWeight: 0.015,
            wastePercent: 0.0,
            netWeight: 0.015,
            unit: 'kg',
            unitPrice: 50000,
            notes: "Ta'm kuchaytirgich"
          }
        ],

        operationalCosts: {
          laborPerKg: 2200,
          utilitiesPerKg: 600,
          depreciationPerKg: 200,
          transportPerKg: 500,
          overheadPerKg: 300
        },

        packagingConfig: {
          defaultType: 'container_500g',
          containerMaterialId: 'mat_pack_500g',
          portionSizeKg: 0.50,
          containersNeeded: 20,
          includeLabel: true,
          labelMaterialId: 'mat_label_brand',
          includeBag: false,
          bagMaterialId: 'mat_bag_plastic'
        }
      },

      // 2) Kamdi-cha (qarsildoq kartoshkali koreys salati)
      {
        id: 'recipe_kamdicha',
        code: 'REC-07',
        nameUz: "Kamdi-cha (qarsildoq kartoshka salati)",
        nameRu: "Камди-ча (хрустящий корейский картофельный салат)",
        category: "Kraxmalli / Sabzavotli",
        batchOutputKg: 10.0,
        portionSizesKg: [0.25, 0.5, 1.0],
        defaultMarkupPercent: 45.0,
        preparationTimeMin: 50,
        shelfLifeDays: 5,
        storageConditions: "+2°C dan +5°C gacha sovutgichda",
        descriptionUz: "Yupqa qirg'ichlangan, kraxmali yuvilib 2 daqiqa qarsildoq qilib blanshirlangan kartoshka somonchasi, qovurilgan piyoz, sarimsoq va murchli yog' aralashmasi.",
        descriptionRu: "Популярный хрустящий салат из тонкой картофельной соломки, бланшированной в подкисленной воде, с ароматным маслом, жареным луком и чесноком.",

        ingredients: [
          {
            materialId: 'mat_kartoshka',
            nameUz: "Kartoshka (saralangan)",
            nameRu: "Картофель отборный",
            grossWeight: 10.50,
            wastePercent: 14.0,
            netWeight: 9.03,
            unit: 'kg',
            unitPrice: 5000,
            notes: "Koreys qirg'ichida qirilgan, kraxmali 3 marta yuvilgan, 2 daqiqa sirkali suvda blanshirlangan"
          },
          {
            materialId: 'mat_piyoz',
            nameUz: "Piyoz (bosh piyoz)",
            nameRu: "Лук репчатый",
            grossWeight: 1.00,
            wastePercent: 10.0,
            netWeight: 0.90,
            unit: 'kg',
            unitPrice: 3000,
            notes: "Yog'da tillarang qilib qovuriladi"
          },
          {
            materialId: 'mat_sarimsoq',
            nameUz: "Sarimsoq (Chesnok)",
            nameRu: "Чеснок свежий",
            grossWeight: 0.18,
            wastePercent: 8.5,
            netWeight: 0.165,
            unit: 'kg',
            unitPrice: 35000,
            notes: "Presslangan"
          },
          {
            materialId: 'mat_kok_piyoz',
            nameUz: "Ko'k piyoz",
            nameRu: "Зеленый лук",
            grossWeight: 0.20,
            wastePercent: 10.0,
            netWeight: 0.18,
            unit: 'kg',
            unitPrice: 15000,
            notes: "Mayda to'g'ralgan"
          },
          {
            materialId: 'mat_kinza',
            nameUz: "Kashnich ko'kati (Kinza)",
            nameRu: "Свежая кинза",
            grossWeight: 0.15,
            wastePercent: 10.0,
            netWeight: 0.135,
            unit: 'kg',
            unitPrice: 15000,
            notes: "Mayda to'g'ralgan"
          },
          {
            materialId: 'mat_yogi',
            nameUz: "O'simlik yog'i",
            nameRu: "Масло растительное",
            grossWeight: 0.60,
            wastePercent: 0.0,
            netWeight: 0.60,
            unit: 'litr',
            unitPrice: 16000,
            notes: "Piyozni qovurish va qizdirib quyish uchun"
          },
          {
            materialId: 'mat_soya_sousi',
            nameUz: "So'ya sousi",
            nameRu: "Соевый соус",
            grossWeight: 0.20,
            wastePercent: 0.0,
            netWeight: 0.20,
            unit: 'litr',
            unitPrice: 22000,
            notes: "Ta'm va rang berish"
          },
          {
            materialId: 'mat_uksus70',
            nameUz: "Sirka kislotasi 70%",
            nameRu: "Уксусная эссенция 70%",
            grossWeight: 0.04,
            wastePercent: 0.0,
            netWeight: 0.04,
            unit: 'litr',
            unitPrice: 12000,
            notes: "Qaynatish suvida va salatda qarsildoq ushlash uchun"
          },
          {
            materialId: 'mat_shakar',
            nameUz: "Shakar qumi",
            nameRu: "Сахар-песок",
            grossWeight: 0.10,
            wastePercent: 0.0,
            netWeight: 0.10,
            unit: 'kg',
            unitPrice: 12000,
            notes: "Muvozanat"
          },
          {
            materialId: 'mat_tuz',
            nameUz: "Osh tuzi",
            nameRu: "Соль пищевая",
            grossWeight: 0.18,
            wastePercent: 0.0,
            netWeight: 0.18,
            unit: 'kg',
            unitPrice: 3000,
            notes: "Tuzlash va qaynatishga"
          },
          {
            materialId: 'mat_kashnich_urug',
            nameUz: "Kashnich urug'i (Koriandr)",
            nameRu: "Семена кориандра молотые",
            grossWeight: 0.04,
            wastePercent: 0.0,
            netWeight: 0.04,
            unit: 'kg',
            unitPrice: 45000,
            notes: "Sharqona xushbo'y hid"
          },
          {
            materialId: 'mat_qalampir_qizil',
            nameUz: "Qizil achchiq murch",
            nameRu: "Красный острый перец",
            grossWeight: 0.035,
            wastePercent: 0.0,
            netWeight: 0.035,
            unit: 'kg',
            unitPrice: 60000,
            notes: "Achchiqlik darajasi"
          },
          {
            materialId: 'mat_kunjut',
            nameUz: "Kunjut urug'i",
            nameRu: "Семена кунжута белые",
            grossWeight: 0.04,
            wastePercent: 0.0,
            netWeight: 0.04,
            unit: 'kg',
            unitPrice: 40000,
            notes: "Qovurilgan kunjut"
          },
          {
            materialId: 'mat_ajinomoto',
            nameUz: "Glyutamat natriy",
            nameRu: "Глутамат натрия",
            grossWeight: 0.015,
            wastePercent: 0.0,
            netWeight: 0.015,
            unit: 'kg',
            unitPrice: 50000,
            notes: "Ta'mni kuchaytiruvchi"
          }
        ],

        operationalCosts: {
          laborPerKg: 1800,
          utilitiesPerKg: 600,
          depreciationPerKg: 200,
          transportPerKg: 500,
          overheadPerKg: 300
        },

        packagingConfig: {
          defaultType: 'container_500g',
          containerMaterialId: 'mat_pack_500g',
          portionSizeKg: 0.50,
          containersNeeded: 20,
          includeLabel: true,
          labelMaterialId: 'mat_label_brand',
          includeBag: false,
          bagMaterialId: 'mat_bag_plastic'
        }
      },

      // 3) Mol go'shtli He salati (Klassik Go'sht-cha)
      {
        id: 'recipe_he_goshtli',
        code: 'REC-08',
        nameUz: "Mol go'shtli He salati (Klassik He)",
        nameRu: "Хе из говядины по-корейски (Мясное Хе)",
        category: "Go'shtli",
        batchOutputKg: 10.0,
        portionSizesKg: [0.25, 0.5, 1.0],
        defaultMarkupPercent: 40.0,
        preparationTimeMin: 150,
        shelfLifeDays: 8,
        storageConditions: "+1°C dan +4°C gacha sovutgichda",
        descriptionUz: "Muzdek holda somoncha qilib kesilgan, sirkada marinadlangan lahm mol go'shti, qovurilgan piyozli yog', yangi bodring, sabzi va kinza ko'kati.",
        descriptionRu: "Традиционное корейское хе из отборной говядины, маринованной в уксусе, с обжаренным луком, соломкой свежих огурцов и кориандром.",

        ingredients: [
          {
            materialId: 'mat_mol_goshti',
            nameUz: "Mol go'shti (lahm)",
            nameRu: "Говядина бескостная (мякоть)",
            grossWeight: 4.80,
            wastePercent: 8.0,
            netWeight: 4.416,
            unit: 'kg',
            unitPrice: 95000,
            notes: "Muzdek yupqa somoncha kesilib, 70% sirkada 2.5 soat marinadlanadi"
          },
          {
            materialId: 'mat_bodring',
            nameUz: "Bodring (yangi)",
            nameRu: "Огурцы свежие",
            grossWeight: 2.50,
            wastePercent: 7.0,
            netWeight: 2.325,
            unit: 'kg',
            unitPrice: 18000,
            notes: "Somoncha to'g'ralgan, suvi siqilgan"
          },
          {
            materialId: 'mat_sabzi',
            nameUz: "Sabzi (toza qizil)",
            nameRu: "Морковь свежая",
            grossWeight: 1.50,
            wastePercent: 12.0,
            netWeight: 1.32,
            unit: 'kg',
            unitPrice: 4000,
            notes: "Yupqa qirg'ichlangan"
          },
          {
            materialId: 'mat_piyoz',
            nameUz: "Piyoz (bosh piyoz)",
            nameRu: "Лук репчатый",
            grossWeight: 1.20,
            wastePercent: 10.0,
            netWeight: 1.08,
            unit: 'kg',
            unitPrice: 3000,
            notes: "Yarim halqa qilib ko'p yog'da qovuriladi"
          },
          {
            materialId: 'mat_sarimsoq',
            nameUz: "Sarimsoq (Chesnok)",
            nameRu: "Чеснок свежий",
            grossWeight: 0.22,
            wastePercent: 8.5,
            netWeight: 0.20,
            unit: 'kg',
            unitPrice: 35000,
            notes: "Mayda ezilgan"
          },
          {
            materialId: 'mat_kinza',
            nameUz: "Kashnich ko'kati (Kinza)",
            nameRu: "Свежая кинза",
            grossWeight: 0.20,
            wastePercent: 10.0,
            netWeight: 0.18,
            unit: 'kg',
            unitPrice: 15000,
            notes: "Yangi barglari to'g'ralgan"
          },
          {
            materialId: 'mat_yogi',
            nameUz: "O'simlik yog'i",
            nameRu: "Масло растительное",
            grossWeight: 0.60,
            wastePercent: 0.0,
            netWeight: 0.60,
            unit: 'litr',
            unitPrice: 16000,
            notes: "Piyozni qovurish va qaynoq quyish uchun"
          },
          {
            materialId: 'mat_soya_sousi',
            nameUz: "So'ya sousi",
            nameRu: "Соевый соус",
            grossWeight: 0.25,
            wastePercent: 0.0,
            netWeight: 0.25,
            unit: 'litr',
            unitPrice: 22000,
            notes: "Sho'rlik va chuqur ta'm"
          },
          {
            materialId: 'mat_uksus70',
            nameUz: "Sirka kislotasi 70%",
            nameRu: "Уксусная эссенция 70%",
            grossWeight: 0.07,
            wastePercent: 0.0,
            netWeight: 0.07,
            unit: 'litr',
            unitPrice: 12000,
            notes: "Go'shtni pishirish marinadi"
          },
          {
            materialId: 'mat_shakar',
            nameUz: "Shakar qumi",
            nameRu: "Сахар-песок",
            grossWeight: 0.12,
            wastePercent: 0.0,
            netWeight: 0.12,
            unit: 'kg',
            unitPrice: 12000,
            notes: "Nordonlikni muvozanatlash"
          },
          {
            materialId: 'mat_tuz',
            nameUz: "Osh tuzi",
            nameRu: "Соль пищевая",
            grossWeight: 0.15,
            wastePercent: 0.0,
            netWeight: 0.15,
            unit: 'kg',
            unitPrice: 3000,
            notes: "Go'sht va sabzavot tuzlash"
          },
          {
            materialId: 'mat_kashnich_urug',
            nameUz: "Kashnich urug'i (Koriandr)",
            nameRu: "Семена кориандра молотые",
            grossWeight: 0.05,
            wastePercent: 0.0,
            netWeight: 0.05,
            unit: 'kg',
            unitPrice: 45000,
            notes: "Maydalangan yangi koriandr"
          },
          {
            materialId: 'mat_qalampir_qizil',
            nameUz: "Qizil achchiq murch",
            nameRu: "Красный острый перец",
            grossWeight: 0.04,
            wastePercent: 0.0,
            netWeight: 0.04,
            unit: 'kg',
            unitPrice: 60000,
            notes: "He o'tkirligi uchun"
          },
          {
            materialId: 'mat_kunjut',
            nameUz: "Kunjut urug'i",
            nameRu: "Семена кунжута белые",
            grossWeight: 0.05,
            wastePercent: 0.0,
            netWeight: 0.05,
            unit: 'kg',
            unitPrice: 40000,
            notes: "Qovurilgan kunjut"
          },
          {
            materialId: 'mat_ajinomoto',
            nameUz: "Glyutamat natriy",
            nameRu: "Глутамат натрия",
            grossWeight: 0.02,
            wastePercent: 0.0,
            netWeight: 0.02,
            unit: 'kg',
            unitPrice: 50000,
            notes: "Umami kuchaytirgich"
          }
        ],

        operationalCosts: {
          laborPerKg: 3000, // Go'shtni yupqa to'g'rash yuqori malaka talab qiladi
          utilitiesPerKg: 600,
          depreciationPerKg: 250,
          transportPerKg: 600,
          overheadPerKg: 350
        },

        packagingConfig: {
          defaultType: 'container_500g',
          containerMaterialId: 'mat_pack_500g',
          portionSizeKg: 0.50,
          containersNeeded: 20,
          includeLabel: true,
          labelMaterialId: 'mat_label_brand',
          includeBag: false,
          bagMaterialId: 'mat_bag_plastic'
        }
      },

      // 4) Bodring-cha (Oi-muchim / Koreyscha achchiq bodring)
      {
        id: 'recipe_bodringcha',
        code: 'REC-09',
        nameUz: "Bodring-cha (Oi-muchim)",
        nameRu: "Огурцы по-корейски (Ои-мучим)",
        category: "Sabzavotli",
        batchOutputKg: 10.0,
        portionSizesKg: [0.25, 0.5, 1.0],
        defaultMarkupPercent: 45.0,
        preparationTimeMin: 40,
        shelfLifeDays: 5,
        storageConditions: "+2°C dan +5°C gacha sovutgichda",
        descriptionUz: "Qarsildoq bodring bo'laklari, qizil Kochukaru murchi, qizdirilgan xushbo'y pista yog'i, sarimsoq, so'ya sousi va mo'l kunjut sepilgan tez tayyorlanadigan yozgi salat.",
        descriptionRu: "Хрустящий пряный салат из битых огурцов с корейским острым перцем кочукару, чесноком, соевым соусом и поджаренным кунжутом.",

        ingredients: [
          {
            materialId: 'mat_bodring',
            nameUz: "Bodring (yangi uzilgan)",
            nameRu: "Огурцы свежие грунтовые",
            grossWeight: 10.20,
            wastePercent: 7.0,
            netWeight: 9.486,
            unit: 'kg',
            unitPrice: 18000,
            notes: "Qiya parrak yoki 4 ga bo'lingan, 15 daqiqa tuzlab suvi to'kilgan"
          },
          {
            materialId: 'mat_sarimsoq',
            nameUz: "Sarimsoq (Chesnok)",
            nameRu: "Чеснок свежий",
            grossWeight: 0.25,
            wastePercent: 8.5,
            netWeight: 0.228,
            unit: 'kg',
            unitPrice: 35000,
            notes: "Ezilgan"
          },
          {
            materialId: 'mat_kok_piyoz',
            nameUz: "Ko'k piyoz",
            nameRu: "Зеленый лук",
            grossWeight: 0.30,
            wastePercent: 10.0,
            netWeight: 0.27,
            unit: 'kg',
            unitPrice: 15000,
            notes: "To'g'ralgan"
          },
          {
            materialId: 'mat_kinza',
            nameUz: "Kashnich ko'kati (Kinza)",
            nameRu: "Свежая кинза",
            grossWeight: 0.15,
            wastePercent: 10.0,
            netWeight: 0.135,
            unit: 'kg',
            unitPrice: 15000,
            notes: "Mayda to'g'ralgan"
          },
          {
            materialId: 'mat_yogi',
            nameUz: "O'simlik yog'i",
            nameRu: "Масло растительное",
            grossWeight: 0.45,
            wastePercent: 0.0,
            netWeight: 0.45,
            unit: 'litr',
            unitPrice: 16000,
            notes: "Qizdirib quyish uchun"
          },
          {
            materialId: 'mat_soya_sousi',
            nameUz: "So'ya sousi",
            nameRu: "Соевый соус",
            grossWeight: 0.25,
            wastePercent: 0.0,
            netWeight: 0.25,
            unit: 'litr',
            unitPrice: 22000,
            notes: "Sho'rlik va ta'm"
          },
          {
            materialId: 'mat_uksus70',
            nameUz: "Sirka kislotasi 70%",
            nameRu: "Уксусная эссенция 70%",
            grossWeight: 0.03,
            wastePercent: 0.0,
            netWeight: 0.03,
            unit: 'litr',
            unitPrice: 12000,
            notes: "Yengil nordonlik"
          },
          {
            materialId: 'mat_shakar',
            nameUz: "Shakar qumi",
            nameRu: "Сахар-песок",
            grossWeight: 0.10,
            wastePercent: 0.0,
            netWeight: 0.10,
            unit: 'kg',
            unitPrice: 12000,
            notes: "Muvozanat"
          },
          {
            materialId: 'mat_tuz',
            nameUz: "Osh tuzi",
            nameRu: "Соль пищевая",
            grossWeight: 0.20,
            wastePercent: 0.0,
            netWeight: 0.20,
            unit: 'kg',
            unitPrice: 3000,
            notes: "Bodringni terlatish va tuzlashga"
          },
          {
            materialId: 'mat_kashnich_urug',
            nameUz: "Kashnich urug'i (Koriandr)",
            nameRu: "Семена кориандра молотые",
            grossWeight: 0.04,
            wastePercent: 0.0,
            netWeight: 0.04,
            unit: 'kg',
            unitPrice: 45000,
            notes: "Sharqona hid"
          },
          {
            materialId: 'mat_qalampir_qizil',
            nameUz: "Qizil achchiq murch (Kochukaru)",
            nameRu: "Красный острый перец (Кочукару)",
            grossWeight: 0.05,
            wastePercent: 0.0,
            netWeight: 0.05,
            unit: 'kg',
            unitPrice: 60000,
            notes: "Yorqin achchiq tus"
          },
          {
            materialId: 'mat_kunjut',
            nameUz: "Kunjut urug'i",
            nameRu: "Семена кунжута белые",
            grossWeight: 0.06,
            wastePercent: 0.0,
            netWeight: 0.06,
            unit: 'kg',
            unitPrice: 40000,
            notes: "Mo'l kunjut sepiladi"
          },
          {
            materialId: 'mat_ajinomoto',
            nameUz: "Glyutamat natriy",
            nameRu: "Глутамат натрия",
            grossWeight: 0.015,
            wastePercent: 0.0,
            netWeight: 0.015,
            unit: 'kg',
            unitPrice: 50000,
            notes: "Umami kuchaytirgich"
          }
        ],

        operationalCosts: {
          laborPerKg: 1800,
          utilitiesPerKg: 400,
          depreciationPerKg: 200,
          transportPerKg: 500,
          overheadPerKg: 300
        },

        packagingConfig: {
          defaultType: 'container_500g',
          containerMaterialId: 'mat_pack_500g',
          portionSizeKg: 0.50,
          containersNeeded: 20,
          includeLabel: true,
          labelMaterialId: 'mat_label_brand',
          includeBag: false,
          bagMaterialId: 'mat_bag_plastic'
        }
      }
    ]
  };

  // =========================================================================
  // 7. MATEMATIK VA IQTISODIY HISOBLASH METODLARI (Engine va UI uchun tayyor yordamchilar)
  // =========================================================================
  const CalculationHelpers = {
    /**
     * Chiqindi foizi asosida Brutto yoki Nettodan qayta hisoblash
     * Netto = Brutto * (1 - wastePercent / 100)
     * Brutto = Netto / (1 - wastePercent / 100)
     */
    calcNetto: function (gross, wastePercent) {
      const wp = Math.max(0, Math.min(99.9, Number(wastePercent) || 0));
      return (Number(gross) || 0) * (1 - wp / 100);
    },

    calcBrutto: function (netto, wastePercent) {
      const wp = Math.max(0, Math.min(99.9, Number(wastePercent) || 0));
      return (Number(netto) || 0) / (1 - wp / 100);
    },

    /**
     * Bitta ingredient xarajatini hisoblash
     */
    calcIngredientCost: function (ingredient, materialPriceOverride) {
      const price = materialPriceOverride !== undefined ? materialPriceOverride : (ingredient.unitPrice || 0);
      const gross = Number(ingredient.grossWeight) || 0;
      return Math.round(gross * price);
    },

    /**
     * To'liq retsept bo'yicha tannarxni hisoblash
     * @param {Object} recipe - Retsept obyekti
     * @param {Object} rawMaterialsMap - { [id]: material } aktual narxlar xaritasi
     * @param {Number} targetBatchOutputKg - Agar partiya hajmi o'zgartirilsa (default recipe.batchOutputKg)
     * @param {Number} markupPercentOverride - Agar ustama foizi o'zgartirilsa
     */
    calculateRecipeTotals: function (recipe, rawMaterialsMap, targetBatchOutputKg, markupPercentOverride) {
      if (!recipe) return null;

      const baseBatchOutput = Number(recipe.batchOutputKg) || 10.0;
      const targetBatchOutput = (targetBatchOutputKg !== undefined && Number(targetBatchOutputKg) > 0)
        ? Number(targetBatchOutputKg)
        : baseBatchOutput;
      const scale = targetBatchOutput / baseBatchOutput;

      // 1. Xomashyo xarajatlari
      let rawMaterialsTotalCost = 0;
      let totalGrossWeight = 0;
      let totalNetWeight = 0;

      const calculatedIngredients = (recipe.ingredients || []).map(ing => {
        const mat = (rawMaterialsMap && rawMaterialsMap[ing.materialId]) || null;
        const unitPrice = mat ? (mat.pricePerUnit || 0) : (ing.unitPrice || 0);
        const gross = (Number(ing.grossWeight) || 0) * scale;
        const wastePercent = Number(ing.wastePercent) || 0;
        const net = this.calcNetto(gross, wastePercent);
        const cost = Math.round(gross * unitPrice);

        rawMaterialsTotalCost += cost;
        totalGrossWeight += gross;
        totalNetWeight += net;

        return {
          materialId: ing.materialId,
          nameUz: ing.nameUz || (mat && mat.nameUz) || "Noma'lum xomashyo",
          nameRu: ing.nameRu || (mat && mat.nameRu) || "Неизвестное сырье",
          unit: ing.unit || (mat && mat.unit) || 'kg',
          unitPrice: unitPrice,
          grossWeight: Number(gross.toFixed(3)),
          wastePercent: wastePercent,
          netWeight: Number(net.toFixed(3)),
          cost: cost,
          notes: ing.notes || ""
        };
      });

      // 2. Operatsion xarajatlar (mehnat, kommunal, amortizatsiya, transport, ustama)
      const ops = recipe.operationalCosts || {};
      const laborPerKg = Number(ops.laborPerKg) || 0;
      const utilitiesPerKg = Number(ops.utilitiesPerKg) || 0;
      const depreciationPerKg = Number(ops.depreciationPerKg) || 0;
      const transportPerKg = Number(ops.transportPerKg) || 0;
      const overheadPerKg = Number(ops.overheadPerKg) || 0;

      const totalLaborCost = Math.round(laborPerKg * targetBatchOutput);
      const totalUtilitiesCost = Math.round(utilitiesPerKg * targetBatchOutput);
      const totalDepreciationCost = Math.round(depreciationPerKg * targetBatchOutput);
      const totalTransportCost = Math.round(transportPerKg * targetBatchOutput);
      const totalOverheadCost = Math.round(overheadPerKg * targetBatchOutput);

      const operationalTotalCost = totalLaborCost + totalUtilitiesCost + totalDepreciationCost + totalTransportCost + totalOverheadCost;

      // 3. Qadoqlash xarajatlari (Standart partiya uchun)
      const pack = recipe.packagingConfig || {};
      const portionSize = Number(pack.portionSizeKg) || 0.50;
      const containersNeeded = Math.ceil(targetBatchOutput / (portionSize > 0 ? portionSize : 0.50));

      const containerMat = (rawMaterialsMap && rawMaterialsMap[pack.containerMaterialId]) || null;
      const containerPrice = containerMat ? containerMat.pricePerUnit : 1100;
      const containersCost = containersNeeded * containerPrice;

      let labelsCost = 0;
      if (pack.includeLabel) {
        const labelMat = (rawMaterialsMap && rawMaterialsMap[pack.labelMaterialId]) || null;
        const labelPrice = labelMat ? labelMat.pricePerUnit : 200;
        labelsCost = containersNeeded * labelPrice;
      }

      let bagsCost = 0;
      if (pack.includeBag) {
        const bagMat = (rawMaterialsMap && rawMaterialsMap[pack.bagMaterialId]) || null;
        const bagPrice = bagMat ? bagMat.pricePerUnit : 100;
        bagsCost = containersNeeded * bagPrice;
      }

      const packagingTotalCost = containersCost + labelsCost + bagsCost;

      // 4. Jami tannarx
      const totalBatchCost = rawMaterialsTotalCost + operationalTotalCost + packagingTotalCost;
      const costPerKg = targetBatchOutput > 0 ? Math.round(totalBatchCost / targetBatchOutput) : 0;
      const costPerPortion = containersNeeded > 0 ? Math.round(totalBatchCost / containersNeeded) : 0;

      // 5. Sotish narxi va Rentabellik
      const markupPercent = markupPercentOverride !== undefined
        ? Number(markupPercentOverride)
        : (Number(recipe.defaultMarkupPercent) || 40.0);

      const recommendedSellingPricePerKg = Math.round(costPerKg * (1 + markupPercent / 100));
      const recommendedSellingPriceTotal = Math.round(totalBatchCost * (1 + markupPercent / 100));
      const recommendedSellingPricePerPortion = containersNeeded > 0
        ? Math.round(recommendedSellingPriceTotal / containersNeeded)
        : 0;

      const netProfitTotal = recommendedSellingPriceTotal - totalBatchCost;
      const netProfitPerKg = recommendedSellingPricePerKg - costPerKg;
      const profitabilityMarginPercent = recommendedSellingPriceTotal > 0
        ? Number(((netProfitTotal / recommendedSellingPriceTotal) * 100).toFixed(1))
        : 0;

      // 6. Xarajatlar strukturasini foizlarda taqsimlash (Chart.js uchun)
      const costBreakdownPercent = {
        rawMaterials: totalBatchCost > 0 ? Number(((rawMaterialsTotalCost / totalBatchCost) * 100).toFixed(1)) : 0,
        labor: totalBatchCost > 0 ? Number(((totalLaborCost / totalBatchCost) * 100).toFixed(1)) : 0,
        packaging: totalBatchCost > 0 ? Number(((packagingTotalCost / totalBatchCost) * 100).toFixed(1)) : 0,
        utilities: totalBatchCost > 0 ? Number(((totalUtilitiesCost / totalBatchCost) * 100).toFixed(1)) : 0,
        transport: totalBatchCost > 0 ? Number(((totalTransportCost / totalBatchCost) * 100).toFixed(1)) : 0,
        depreciation: totalBatchCost > 0 ? Number(((totalDepreciationCost / totalBatchCost) * 100).toFixed(1)) : 0,
        overhead: totalBatchCost > 0 ? Number(((totalOverheadCost / totalBatchCost) * 100).toFixed(1)) : 0
      };

      return {
        recipeId: recipe.id,
        recipeNameUz: recipe.nameUz,
        recipeNameRu: recipe.nameRu,
        targetBatchOutputKg: targetBatchOutput,
        scaleFactor: scale,

        ingredients: calculatedIngredients,
        totalGrossWeight: Number(totalGrossWeight.toFixed(3)),
        totalNetWeight: Number(totalNetWeight.toFixed(3)),

        // Xarajatlar guruhlari
        rawMaterialsTotalCost: rawMaterialsTotalCost,
        operationalTotalCost: operationalTotalCost,
        packagingTotalCost: packagingTotalCost,

        // Batafsil operatsion xarajatlar
        operationalDetails: {
          laborCost: totalLaborCost,
          utilitiesCost: totalUtilitiesCost,
          depreciationCost: totalDepreciationCost,
          transportCost: totalTransportCost,
          overheadCost: totalOverheadCost
        },

        // Qadoqlash detallari
        packagingDetails: {
          portionSizeKg: portionSize,
          containersNeeded: containersNeeded,
          containerPrice: containerPrice,
          containersCost: containersCost,
          labelsCost: labelsCost,
          bagsCost: bagsCost,
          packagingTotalCost: packagingTotalCost
        },

        // Yig'ma ko'rsatkichlar
        totalBatchCost: totalBatchCost,
        costPerKg: costPerKg,
        costPerPortion: costPerPortion,

        // Savdo va daromad
        markupPercent: markupPercent,
        recommendedSellingPricePerKg: recommendedSellingPricePerKg,
        recommendedSellingPricePerPortion: recommendedSellingPricePerPortion,
        recommendedSellingPriceTotal: recommendedSellingPriceTotal,
        netProfitTotal: netProfitTotal,
        netProfitPerKg: netProfitPerKg,
        profitabilityMarginPercent: profitabilityMarginPercent,

        // Diagramma uchun taqsimot
        costBreakdownPercent: costBreakdownPercent
      };
    },

    /**
     * Valyutani O'zbekiston formatida chiqarish (masalan: 14 500 so'm)
     */
    formatCurrency: function (amount) {
      const val = Math.round(Number(amount) || 0);
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + APP_CONFIG.currencySymbol;
    },

    /**
     * Og'irlikni chiroyli formatlash (kg yoki gramm)
     */
    formatWeight: function (weightKg) {
      const w = Number(weightKg) || 0;
      if (w < 1.0) {
        return Math.round(w * 1000) + " g";
      }
      return w.toFixed(2).replace(/\.00$/, '') + " kg";
    },

    /**
     * Ob'ektni chuqur nusxalash (default holatni buzmaslik uchun)
     */
    cloneDeep: function (obj) {
      if (typeof structuredClone === 'function') {
        try {
          return structuredClone(obj);
        } catch (e) {
          // fallback
        }
      }
      return JSON.parse(JSON.stringify(obj));
    }
  };

  // Boshlang'ich katalog ma'lumotlari: toza, bo'sh baza (foydalanuvchi o'zi kiritishi uchun)
  DEFAULT_RECIPES = [];
  DEFAULT_RAW_MATERIALS = [];

  // =========================================================================
  // 8. KATALOGNI TAYYORLASH VA EXPORT QILISH
  // =========================================================================
  const AppCatalog = {
    APP_CONFIG: APP_CONFIG,
    RAW_MATERIAL_CATEGORIES: RAW_MATERIAL_CATEGORIES,
    EXPENSE_CATEGORIES: EXPENSE_CATEGORIES,
    DEFAULT_RAW_MATERIALS: DEFAULT_RAW_MATERIALS,
    DEFAULT_RECIPES: DEFAULT_RECIPES,
    AI_KNOWLEDGE_BASE: AI_KNOWLEDGE_BASE,
    helpers: CalculationHelpers,

    // Tezkor qidiruv uchun lug'at (id bo'yicha Map)
    getRawMaterialsMap: function () {
      const map = {};
      DEFAULT_RAW_MATERIALS.forEach(mat => {
        map[mat.id] = Object.assign({}, mat);
      });
      return map;
    },

    getRecipesMap: function () {
      const map = {};
      DEFAULT_RECIPES.forEach(rec => {
        map[rec.id] = CalculationHelpers.cloneDeep(rec);
      });
      return map;
    },

    // Barcha retseptlar (default + templates) xaritasi
    getAllTemplateRecipesMap: function () {
      const map = {};
      (AI_KNOWLEDGE_BASE.recipeTemplates || []).forEach(rec => {
        map[rec.id] = CalculationHelpers.cloneDeep(rec);
      });
      return map;
    }
  };

  return AppCatalog;
}));
