/* Central, source-verified Quran reciter catalogue shared by the Academy and public Maqraa.
   Arabic verse-by-verse recitations are served by EveryAyah; incomplete and non-Hafs sets are not exposed in the Hafs text player. */
(function(g){
  const rows=[
    ['mishary','Alafasy_128kbps','الشيخ مشاري راشد العفاسي','مرتّل'],
    ['husary','Husary_128kbps','الشيخ محمود خليل الحصري','مرتّل'],
    ['husaryTeacher','Husary_Muallim_128kbps','الشيخ محمود خليل الحصري','معلّم'],
    ['husaryMujawwad','Husary_128kbps_Mujawwad','الشيخ محمود خليل الحصري','مجود'],
    ['minshawy','Minshawy_Murattal_128kbps','الشيخ محمد صديق المنشاوي','مرتّل'],
    ['minshawyMujawwad','Minshawy_Mujawwad_192kbps','الشيخ محمد صديق المنشاوي','مجود'],
    ['muaiqly','MaherAlMuaiqly128kbps','الشيخ ماهر المعيقلي','مرتّل'],
    ['hudhaify','Hudhaify_128kbps','الشيخ علي الحذيفي','مرتّل'],
    ['shatri','Abu_Bakr_Ash-Shaatree_128kbps','الشيخ أبو بكر الشاطري','مرتّل'],
    ['basfar','Abdullah_Basfar_192kbps','الشيخ عبد الله بصفر','مرتّل'],
    ['aliJaber','Ali_Jaber_64kbps','الشيخ علي جابر','مرتّل'],
    ['faresAbbad','Fares_Abbad_64kbps','الشيخ فارس عباد','مرتّل'],
    ['ghamadi','Ghamadi_40kbps','الشيخ سعد الغامدي','مرتّل'],
    ['haniRifai','Hani_Rifai_192kbps','الشيخ هاني الرفاعي','مرتّل'],
    ['tunaiji','khalefa_al_tunaiji_64kbps','الشيخ خليفة الطنيجي','مرتّل'],
    ['qahtani','Khaalid_Abdullaah_al-Qahtaanee_192kbps','الشيخ خالد القحطاني','مرتّل'],
    ['banna','mahmoud_ali_al_banna_32kbps','الشيخ محمود علي البنا','مرتّل'],
    ['tablaway','Mohammad_al_Tablaway_128kbps','الشيخ محمد الطبلاوي','مرتّل'],
    ['abdulBasitMurattal','Abdul_Basit_Murattal_192kbps','الشيخ عبد الباسط عبد الصمد','مرتّل'],
    ['abdulBasitMujawwad','Abdul_Basit_Mujawwad_128kbps','الشيخ عبد الباسط عبد الصمد','مجود'],
    ['juhaynee','Abdullaah_3awwaad_Al-Juhaynee_128kbps','الشيخ عبد الله عواد الجهني','مرتّل'],
    ['ibrahimAkhdar','Ibrahim_Akhdar_32kbps','الشيخ إبراهيم الأخضر','مرتّل'],
    ['muhammadAbdulKareem','Muhammad_AbdulKareem_128kbps','الشيخ محمد عبد الكريم','مرتّل'],
    ['sudais','Abdurrahmaan_As-Sudais_192kbps','الشيخ عبد الرحمن السديس','مرتّل'],
    ['shuraym','Saood_ash-Shuraym_128kbps','الشيخ سعود الشريم','مرتّل'],
    ['ajamy','ahmed_ibn_ali_al_ajamy_128kbps','الشيخ أحمد بن علي العجمي','مرتّل'],
    ['ahmedNeana','Ahmed_Neana_128kbps','الشيخ أحمد نعينع','مرتّل'],
    ['aliHajjaj','Ali_Hajjaj_AlSuesy_128kbps','الشيخ علي حجاج السويسي','مرتّل'],
    ['aymanSowaid','Ayman_Sowaid_64kbps','الشيخ أيمن سويد','مرتّل'],
    ['azizAlili','aziz_alili_128kbps','الشيخ عزيز عليلي','مرتّل'],
    ['abdullahMatroud','Abdullah_Matroud_128kbps','الشيخ عبد الله المطرود','مرتّل'],
    ['muhammadAyyoub','Muhammad_Ayyoub_128kbps','الشيخ محمد أيوب','مرتّل'],
    ['muhammadJibreel','Muhammad_Jibreel_128kbps','الشيخ محمد جبريل','مرتّل'],
    ['muhsinAlQasim','Muhsin_Al_Qasim_192kbps','الشيخ محسن القاسم','مرتّل'],
    ['nasserAlqatami','Nasser_Alqatami_128kbps','الشيخ ناصر القطامي','مرتّل'],
    ['salahAlBudair','Salah_Al_Budair_128kbps','الشيخ صلاح البدير','مرتّل'],
    ['yaserSalamah','Yaser_Salamah_128kbps','الشيخ ياسر سلامة','مرتّل'],
    ['yasserDussary','Yasser_Ad-Dussary_128kbps','الشيخ ياسر الدوسري','مرتّل'],
    ['nabilRifai','Nabil_Rifa3i_48kbps','الشيخ نبيل الرفاعي','مرتّل'],
    ['sahlYassin','Sahl_Yassin_128kbps','الشيخ سهل ياسين','مرتّل'],
    ['salaahBukhatir','Salaah_AbdulRahman_Bukhatir_128kbps','الشيخ صلاح عبد الرحمن بخاطر','مرتّل'],
    ['minshawyTeacher','Minshawy_Teacher_128kbps','الشيخ محمد صديق المنشاوي — المعلّم','معلّم'],
    ['mustafaIsmail','Mustafa_Ismail_48kbps','الشيخ مصطفى إسماعيل','مجود'],
    ['parhizgar','Parhizgar_48kbps','الشيخ شهريار برهيزكار','مرتّل'],
    ['akramAlaqimy','Akram_AlAlaqimy_128kbps','الشيخ أكرم العلاقمي','مرتّل'],
    ['abdulSamad','AbdulSamad_64kbps_QuranExplorer.Com','الشيخ عبد الباسط عبد الصمد — نسخة أخرى','مرتّل']
  ];
  const list=Object.freeze(rows.map(([id,folder,name,style])=>Object.freeze({id,folder,label:`${name} — ${style}`,name,style,source:'EveryAyah'})));
  const byId=Object.freeze(Object.fromEntries(list.map(x=>[x.id,x])));
  const byFolder=Object.freeze(Object.fromEntries(list.map(x=>[x.folder,x])));
  g.ImamQuranReciters=Object.freeze({list,byId,byFolder,defaultId:'mishary',sourceUrl:'https://www.everyayah.com/recitations_ayat.html'});
})(globalThis);
