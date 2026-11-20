# 🥗 Koreys Salatlari Tannarx Kalkulyatori & AI Texnolog (v2.0)
### Себестоимость корейских салатов | Калькулятор & Локальный AI Технолог

O'zbekiston oziq-ovqat ishlab chiqaruvchilari, salat sexlari, restoran va kafe oshpazlari hamda xususiy tadbirkorlar uchun **Koreys salatlarining to'liq tannarxi (себестоимость), texnologik xaritasi, rentabelligi va 100% Offline Lokal AI Maslahatchisi bilan jihozlangan professional tizim**.

Ushbu dastur orqali Toshkent va viloyatlar ulgurji bozor narxlari asosida mahsulotlarning haqiqiy tannarxini hisoblash, tozalashdagi chiqindilar (отход / уварка) hisobini yuritish, ish haqi, transport, kommunal va qadoqlash xarajatlarini qo'shgan holda foydali sotish narxini belgilash, shuningdek, sun'iy intellekt texnologidan professional maslahatlar olish va 1-klikda yangi retseptlarni ilovaga qo'shish mumkin.

---

## 📋 Mundarija

1. [Loyiha haqida va v2.0 yangiliklari](#-loyiha-haqida-va-v20-yangiliklari)
2. [Qanday ishga tushirish](#-qanday-ishga-tushirish)
3. [Fayllar tuzilishi](#-fayllar-tuzilishi)
4. [🤖 Lokal AI Agent ("Koreys Salatlari AI Texnologi")](#-lokal-ai-agent-koreys-salatlari-ai-texnologi)
5. [🛠️ Retseptlar Konstruktori va Tahrirlash Muharriri](#-retseptlar-konstruktori-va-tahrirlash-muharriri)
6. [🥗 Mavjud retseptlar va texnologik xaritalar (9 ta salat)](#-mavjud-retseptlar-va-texnologik-xaritalar-9-ta-salat)
7. [📐 Tannarxni hisoblash metodologiyasi va formulalar](#-tannarxni-hisoblash-metodologiyasi-va-formulalar)
8. [🥕 Xomashyo va narxlar bazasi (38 ta mahsulot)](#-xomashyo-va-narxlar-bazasi-38-ta-mahsulot)
9. [📊 Grafik tahlil va taqqoslash](#-grafik-tahlil-va-taqqoslash)
10. [🖨️ Texnologik xarita (Texkarta) va chop etish](#-texnologik-xarita-texkarta-va-chop-etish)
11. [💾 Excel / CSV eksport va ma'lumotlarni saqlash](#-excel--csv-eksport-va-malumotlarni-saqlash)
12. [⚖️ Oziq-ovqat va pazandachilik me'yorlari (Standartlar)](#-oziq-ovqat-va-pazandachilik-meyorlari-standartlar)

---

## 🌟 Loyiha haqida va v2.0 yangiliklari

Koreys salatlarini tayyorlashda eng katta muammolar quyidagilardir:
- Sabzavotlarni tozalashdagi yo'qotishlar (sabzi po'sti, sarimsoq po'sti, karomning tashqi barglari) hisobga olinmaydi;
- Ishchilarning ishbay mehnati (tozalash, qirg'ichdan chiqarish, aralashtirish), kommunal (gaz/elektr), qadoqlash xarajatlari nazardan chetda qoladi;
- Ishlab chiqarishdagi nozik texnologik xatolar sababli salatlar suv berib yuboradi, sabzi yumshab qoladi yoki erta achiydi.

### 🚀 v2.0 versiyasidagi yangi imkoniyatlar:
1. **🤖 Lokal AI Agent ("Koreys Salatlari AI Texnologi")**:
   - 100% Offline (internetsiz) ishlovchi aqlli texnolog;
   - Ishlab chiqarishdagi har qanday muammo (suv oqishi, sho'r bo'lishi, yumshash) sabablari va yechimlarini tushuntiradi;
   - Tannarxni sifatni buzmasdan 15-25% gacha arzonlashtirish usullarini o'rgatadi;
   - Yangi retsept so'ralganda tayyor texkarta tuzadi va **"📥 Ilovaga qo'shish va hisoblash"** tugmasi orqali 1-klikda ilovaga import qiladi;
   - Ixtiyoriy Google Gemini API integratsiyasi mavjud (agar API kalit kiritilmasa, avtomatik ravishda lokal dvigatel ishlaydi).
2. **🛠️ Yangi Retseptlar Konstruktori (`#modal-recipe-builder`)**:
   - Noldan yangi salat retseptini yaratish yoki mavjud istalgan retseptni to'liq tahrirlash;
   - Modal ichida qulay masalliqlar konstruktori (xomashyoni tanlash, netto/brutto va chiqindi foizini belgilash);
   - Operatsion stavkalarni (ish haqi, kommunal, amortizatsiya, transport) alohida sozlash.
3. **🥗 Retseptlar bazasi 9 taga yetkazildi**:
   - 5 ta klassik salat + 4 ta yangi salat (Qo'ziqorinli Grib-cha, Qarsildoq Kamdi-cha, Mol go'shtli He, Bodring-cha).
4. **🥕 Xomashyolar bazasi 38 taga kengaytirildi**:
   - Yangi shampinyon, kartoshka, mol go'shti, tovuq filesi va yangi limon qo'shildi.

---

## 🚀 Qanday ishga tushirish

Dastur mutlaqo mustaqil bo'lib, **hech qanday server (Node.js, PHP, Python), ma'lumotlar bazasi yoki murakkab o'rnatishlarni talab qilmaydi**.

1. Loyiha papkasini oching:
   ```bash
   c:\Users\18aln\Downloads\СебестоимостьТоваров
   ```
2. Papka ichidagi `index.html` faylini istalgan zamonaviy brauzerda oching:
   - Sichqonchaning o'ng tugmasi orqali: **Open with -> Google Chrome** (yoki Edge, Firefox, Safari, Opera).
   - Yoki faylni to'g'ridan-to'g'ri brauzer darchasiga tashlang (Drag & Drop).
3. Dastur bir zumda ishga tushadi! Barcha hisob-kitoblar va Lokal AI brauzeringiz ichida lokal ravishda ishlaydi.

> **Eslatma**: Dastur Tailwind CSS, FontAwesome piktogrammalari va Chart.js kutubxonalarini CDN orqali yuklaydi. Bir marta yuklangach, to'liq offline rejimda ishlayveradi.

---

## 📂 Fayllar tuzilishi

| Fayl | Vazifasi va mazmuni |
| :--- | :--- |
| `index.html` | Barcha 4 ta asosiy bo'lim (Kalkulyator, Xomashyo bazasi, Grafika, Texkarta), yangi Retseptlar Konstruktori modali (`#modal-recipe-builder`), suzuvchi AI tugmasi va zamonaviy AI Chat paneli (`#ai-chat-drawer`). |
| `style.css` | A4 formatda chop etish (`@media print`), chat drawer animatsiyasi, suzuvchi pulsatsiyalanuvchi AI tugmasi, maxsus scrollbarlar. |
| `data.js` | 38 ta xomashyo bazasi, 5 ta standart retsept, 4 ta AI retsept shabloni, to'liq `AI_KNOWLEDGE_BASE` (texnologiyalar, chiqindi me'yorlari, arzonlashtirish sirlari, muammolar yechimlari, savol-javoblar) va hisoblash yordamchilari. |
| `app.js` | To'liq biznes mantiq: `State`, `RecipeBuilder` konstruktori, `SalatAIAgent` (100% Offline Lokal AI dvigateli va Gemini API mijozi), Chart.js integratsiyasi va CSV/Excel eksport. |
| `README.md` | Ushbu to'liq foydalanish qo'llanmasi, formulalar va texnik me'yorlar. |

---

## 🤖 Lokal AI Agent ("Koreys Salatlari AI Texnologi")

Ekranning o'ng pastki burchagidagi yashil nurlanuvchi **"🤖 AI Maslahatchi"** tugmasi orqali ochiladigan sun'iy intellekt yordamchisi:

### 1. Asosiy xususiyatlari:
- **100% Offline Lokal Dvigatel**: Internetga ulanmasdan ham koreys salatlari bo'yicha barcha savollarga professional javob beradi.
- **Tezkor savollar (Quick Chips)**: Bir klikda eng dolzarb savollarga javob olish:
  * 💡 *Tannarxni qanday arzonlashtirish mumkin?*
  * ⚠️ *Salat suv berib yuborsa nima qilish kerak?*
  * 🥕 *Sabzini qarsildoq qilish siri nima?*
  * 🧂 *Kimchi tayyorlashning asosiy sirlari*
  * 🥔 *Kamdi-cha (kartoshka salati) retsepti*
  * 🥩 *Mol go'shtli He salati sirlari*
  * 🍄 *Qo'ziqorinli koreyscha salat retsepti*
- **📥 "Ilovaga qo'shish va hisoblash" (Apply to App)**: AI sizga yangi salat retseptini taklif qilganda, ushbu tugmani bossangiz kifoya — retsept bir zumda ilovaga qo'shiladi, kalkulyatorda ochiladi va uning tannarxi, sotish narxi hamda rentabelligi hisoblab beriladi!
- **Ixtiyoriy Google Gemini API**: Chat yuqorisidagi sozlash tugmasi orqali shaxsiy Gemini API kalitini kiritishingiz mumkin. Agar kalit kiritilmasa yoki internet bo'lmasa, har doim ishonchli Lokal AI javob qaytaradi.

---

## 🛠️ Retseptlar Konstruktori va Tahrirlash Muharriri

Ilovada retseptlarni to'liq boshqarish uchun yangi **"Retseptlar Konstruktori"** (`#modal-recipe-builder`) joriy etildi:

1. **Yangi retsept yaratish**:
   - Kalkulyatordagi **"+ Yangi Retsept"** tugmasini bosing.
   - Salat nomi (o'zbekcha va ruscha), toifasi, standart partiya hajmi (kg), tavsiya etilgan ustama foizi, saqlash muddati va texnologik yo'riqnomani kiriting.
   - Masalliqlar bo'limida 38 ta xomashyodan birini tanlab, uning tozalangan (netto) og'irligi va chiqindi foizini kiriting.
   - Tizim uning brutto og'irligi va tannarxini avtomatik hisoblab jadvalga qo'shadi.
   - Operatsion xarajatlar stavkalarini (ish haqi, kommunal, transport, amortizatsiya) belgilang va **"Retseptni Saqlash"** tugmasini bosing.
2. **Mavjud retseptni to'liq tahrirlash**:
   - Kalkulyatorda tanlangan retsept yonidagi **"✏️ Tahrirlash"** tugmasini bosing.
   - Barcha masalliqlar va operatsion parametrlar modalda ochiladi. Keraksiz masalliqlarni o'chirish, yangilarini qo'shish yoki miqdorini o'zgartirish mumkin.
   - O'zgarishlar darhol brauzer xotirasiga (`localStorage`) saqlanadi va butun dastur bo'ylab yangilanadi.

---

## 🥗 Mavjud retseptlar va texnologik xaritalar (9 ta salat)

Dastur 9 ta eng xaridorgir koreys salatining batafsil texnologik xaritasi bilan ta'minlangan:

| № | Salat nomi | Asosiy xomashyosi | Partiya | Chiqindi me'yori | Texnologik o'ziga xosligi |
| :-: | :--- | :--- | :---: | :---: | :--- |
| 1 | **Morkovcha (Sabzi salati)** | Shirali qizil sabzi | 10 kg | 12% | Qovurilgan piyozli xushbo'y yog', yangi koriandr va sarimsoq |
| 2 | **Funchoza salati** | Kraxmalli lapsha, sabzavotlar | 10 kg | 10% | Lapshaning 2.3 barobar bo'kishi, qarsildoq somoncha sabzavotlar |
| 3 | **Kimchi (Koreyscha karom)**| Pekin karomi, kochukaru qalampir| 10 kg | 15% | Qalin tuzlash, guruch yelimi va an'anaviy fermentatsiya |
| 4 | **Baqlajon salati (Baqlajon-cha)**| Yangi baqlajon, pomidor, bolgar| 10 kg | 12% | Tuzlab achchig'ini chiqarish va yengil qovurish |
| 5 | **Fuju / Spargel salati** | Quritilgan soya fuju | 10 kg | 0% (suvda 2.5x) | Sovuq suvda 4-5 soat ivitish, xushbo'y yog'da marinadlash |
| 6 | **Qo'ziqorinli salat (Grib-cha)**| Shampinyon, bolgar qalampir | 10 kg | 6% | Qisqa qaynatish (blanshirlash), limon sharbati va sarimsoq |
| 7 | **Kamdi-cha (Kartoshka salati)**| Qattiq kartoshka, sarimsoq | 10 kg | 14% | Qirg'ichdan o'tkazib 2 daqiqa qaynoq suvda tutish, qarsildoq qilish |
| 8 | **Mol go'shtli klassik He** | Mol go'shti (lahm), sabzi, piyoz| 10 kg | 8% | Go'shtni 70% sirkada pishirish (denaturatsiya) va qaynoq yog' berish |
| 9 | **Bodring-cha (Oi-muchim)** | Qarsildoq bodring, kunjut | 10 kg | 7% | 15 daqiqa tuzlab ortiqcha suvini to'kish va sous bilan aralashtirish |

---

## 📐 Tannarxni hisoblash metodologiyasi va formulalar

Kalkulyator umumiy ovqatlanish korxonalari va sanoat texnologik xaritalarining xalqaro va davlat standartlariga (GOST / O'zDSt) to'liq mos keluvchi formulalardan foydalanadi:

### 1. Chiqindi (Otxod) va Brutto/Netto hisobi
- **Netto** (tozalangan og'irlik):
  $$\text{Netto} = \text{Brutto} \times \left(1 - \frac{\text{Chiqindi}\%}{100}\right)$$
- **Brutto** (tozalanmagan, bozordan olinadigan og'irlik):
  $$\text{Brutto} = \frac{\text{Netto}}{1 - \frac{\text{Chiqindi}\%}{100}}$$

### 2. Xomashyo xarajatlari
$$\text{Xomashyo Jami} = \sum_{i=1}^{n} (\text{Brutto}_i \times \text{Narx}_i)$$

### 3. Operatsion xarajatlar
$$\text{Operatsion Xarajatlar} = (\text{Mehnat} + \text{Kommunal} + \text{Amortizatsiya} + \text{Transport} + \text{Ustama}) \times \text{Partiya Og'irligi (kg)}$$

### 4. Qadoqlash xarajatlari
$$\text{Idishlar Soni} = \left\lceil \frac{\text{Partiya Og'irligi (kg)}}{\text{Porsiya Hajmi (kg)}} \right\rceil$$
$$\text{Qadoq Jami} = \text{Idishlar Soni} \times (\text{Idish Narxi} + \text{Etiketka Narxi} + \text{Paket Narxi})$$

### 5. Jami partiya va 1 kg mahsulot tannarxi
$$\text{Jami Partiya Tannarxi} = \text{Xomashyo Jami} + \text{Operatsion Xarajatlar} + \text{Qadoq Jami}$$
$$\text{1 kg Salat Tannarxi} = \frac{\text{Jami Partiya Tannarxi}}{\text{Partiya Og'irligi (kg)}}$$

### 6. Tavsiya etilgan sotish narxi, Foyda va Rentabellik
$$\text{Sotish Narxi (1 kg)} = \text{1 kg Tannarxi} \times \left(1 + \frac{\text{Ustama}\%}{100}\right)$$
$$\text{Sof Foyda} = \text{Jami Tushum} - \text{Jami Partiya Tannarxi}$$
$$\text{Rentabellik (Marja}\%) = \frac{\text{Sof Foyda}}{\text{Jami Tushum}} \times 100$$

---

## 🥕 Xomashyo va narxlar bazasi (38 ta mahsulot)

Dasturning **"Xomashyo va Narxlar bazasi"** bo'limida 38 ta asosiy xomashyo 4 toifaga ajratilgan:
1. **Sabzavotlar va ko'katlar**: Sabzi (4,000 so'm), Piyoz (3,000 so'm), Sarimsoq (35,000 so'm), Bodring (18,000 so'm), Baqlajon (15,000 so'm), Pekin karomi (10,000 so'm), Shampinyon qo'ziqorin (28,000 so'm), Kartoshka (5,000 so'm), Mol go'shti (95,000 so'm), Tovuq filesi (42,000 so'm), Limon (20,000 so'm), Bolgar qalampiri, Ko'k piyoz, Kinza, Daikon.
2. **Ziravorlar, yog' va souslar**: O'simlik yog'i (16,000 so'm/l), Uksus 70% (12,000 so'm/l), So'ya sousi (22,000 so'm/l), Kunjut yog'i (85,000 so'm/l), Koriandr urug'i (45,000 so'm/kg), Kochukaru qalampir (60,000 so'm/kg), Paprika (55,000 so'm/kg), Ajinomoto (50,000 so'm/kg), Shakar (12,000 so'm/kg), Tuz (3,000 so'm/kg).
3. **Quruq va kraxmalli mahsulotlar**: Funchoza (45,000 so'm/kg), Fuju / Spargel (60,000 so'm/kg), Guruch uni (14,000 so'm/kg), Oq kunjut (40,000 so'm/kg).
4. **Qadoqlash va tara materiallari**: Konteyner 250g (850 so'm), 500g (1,100 so'm), 1000g (1,600 so'm), Vakuum paket (500 so'm), Brend stiker (200 so'm).

---

## 📊 Grafik tahlil va taqqoslash

Dasturning **"Tannarx Tarkibi va Grafika"** bo'limida:
1. **Tannarx strukturasi (Donut Chart)**: Xomashyo, ish haqi, qadoq, kommunal, transport, amortizatsiya va ustamalarning jami xarajatdagi foiz ulushi.
2. **Eng qimmat 5 ta xomashyo (Horizontal Bar Chart)**: Ushbu partiyadagi byudjetning eng katta qismini tashkil etuvchi ingredientlar reytingi.
3. **Barcha salatlar tannarxi va marjasi taqqoslashi (Grouped Bar Chart)**: Barcha salatlarning 1 kg tannarxi va tavsiya etilgan sotish narxini yonma-yon solishtirish.

---

## 🖨️ Texnologik xarita (Texkarta) va chop etish

Umumiy ovqatlanish korxonalari standartidagi rasmiy hujjat:
- Korxona nomi, xarita raqami, mahsulot nomi va sana;
- Xomashyolarning brutto miqdori, chiqindi foizi, netto miqdori, narxi va summasi;
- Qadoqlash va operatsion xarajatlar yig'indisi;
- 1 kg va 1 idish uchun kalkulyatsiya;
- Tayyorlash texnologiyasi va saqlash shartlari (harorat +2°C dan +6°C gacha).

### Chop etish:
1. **"Chop etish"** tugmasini bosing.
2. Sahifa avtomatik ravishda **A4 o'lchamiga** moslashadi, barcha menyu, tugmalar va AI panellari yashirilib, faqat toza rasmiy hujjat chop etiladi.
3. Shuningdek, **"Save as PDF"** orqali fayl sifatida yuklab olish mumkin.

---

## 💾 Excel / CSV eksport va ma'lumotlarni saqlash

- **Avtomatik saqlash (`localStorage`)**: Kiritilgan barcha o'zgarishlar, yangi retseptlar va tahrirlar brauzer xotirasiga bir zumda yoziladi.
- **Dastlabki holatga qaytarish (Reset)**: Kerak bo'lganda yuqori o'ng burchakdagi qaytarish tugmasi orqali barcha ma'lumotlarni Zavod (Default) sozlamalariga qaytarish mumkin.
- **Excel / CSV eksport**: **"Excelga yuklash"** tugmasi orqali joriy retseptning hisob-kitobini UTF-8 BOM bilan kodlangan `.csv` faylida yuklab olish mumkin (Excel dasturida o'zbekcha harflar buzilmaydi).

---

## ⚖️ Oziq-ovqat va pazandachilik me'yorlari (Standartlar)

| Mahsulot | Standart chiqindi % | Izoh va me'yor sababi |
| :--- | :---: | :--- |
| **Sabzi** | 10% – 15% (standart: 12%) | Yuvish, po'stini archish va ikki uchini kesib tashlash yo'qotishlari |
| **Sarimsoq (Chesnok)** | 6% – 9% (standart: 8.5%) | Quruq po'stlog'i va tub ildizini tozalash |
| **Pekin karomi** | 14% – 18% (standart: 15%) | Tashqi so'ligan barglar va qattiq o'zakni kesish |
| **Bosh piyoz** | 9% – 12% (standart: 10%) | Quruq po'stloq va tag ildizini tozalash |
| **Baqlajon** | 10% – 13% (standart: 12%) | Bandini kesish va saralash |
| **Bodring** | 5% – 8% (standart: 7%) | Ikki uchini kesish va saralash |
| **Kartoshka** | 12% – 16% (standart: 14%) | Po'stini archish va ko'zchalarini tozalash |
| **Shampinyon** | 4% – 8% (standart: 6%) | Oyoqchasining pastki qismini kesish va tozalash |
| **Mol go'shti (lahm)**| 6% – 10% (standart: 8%) | Pay va ortiqcha pardalarni tozalash |
| **Funchoza** | -130% dan -150% gacha | Qaynoq suvda damlanganda og'irligi 2.3 - 2.5 barobar ortadi |
| **Fuju (Quruq spargel)**| -140% dan -160% gacha | Sovuq suvda ivitilganda og'irligi 2.4 - 2.6 barobar ortadi |

---

## 👥 Texnik ma'lumotlar

- **Dastur versiyasi**: 2.0.0
- **Texnologiyalar**: HTML5, Tailwind CSS, JavaScript (Vanilla ES6+), Chart.js, Local AI Engine.
- **Moslashuvchanlik**: Mobil telefonlar, planshetlar va noutbuklar uchun to'liq moslashgan (Responsive Web Design).
- **Litsenziya**: Erkin foydalanish (Open Source).
