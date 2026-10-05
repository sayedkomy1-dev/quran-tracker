'use strict';
/* We Live Quran — source-backed static feature data, v10.3.1 */
(function registerV10Data(g){
  const root=g.ImamApp||(g.ImamApp={});
  root.V10Data=Object.freeze({
    juzRanges:Object.freeze([[1,2],[2,2],[2,3],[3,4],[4,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,11],[11,12],[12,14],[15,16],[17,18],[18,20],[21,22],[23,25],[25,27],[27,29],[29,33],[33,36],[36,39],[39,41],[41,45],[46,51],[51,57],[58,66],[67,77],[78,114]]),
    themes:Object.freeze({
      A:{name:'Emerald & Ivory',p:'#145A3A',d:'#0C3B28',a:'#C9A84C',bg:'#F7F4EC'},
      B:{name:'Deep Teal & Sand',p:'#0D5B55',d:'#083E3A',a:'#C6A15B',bg:'#F7F2E8'},
      C:{name:'Forest & Warm White',p:'#214E3A',d:'#153428',a:'#D0AE61',bg:'#FAF8F3'},
      D:{name:'Navy Islamic',p:'#173D4E',d:'#102B37',a:'#CBA85C',bg:'#F5F7F5'}
    }),
    // Starter records are source-backed only. Do not add generated religious content here.
    hadith:Object.freeze([
      {id:'bukhari-10',text:'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ',narrator:'عبد الله بن عمرو رضي الله عنهما',source:'صحيح البخاري',hadithNumber:'10',grade:'صحيح',category:'الأخلاق',reference:'Sahih al-Bukhari 10'},
      {id:'bukhari-1',text:'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',narrator:'عمر بن الخطاب رضي الله عنه',source:'صحيح البخاري',hadithNumber:'1',grade:'صحيح',category:'النية',reference:'Sahih al-Bukhari 1'},
      {id:'bukhari-13',text:'لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',narrator:'أنس بن مالك رضي الله عنه',source:'صحيح البخاري',hadithNumber:'13',grade:'صحيح',category:'الأخلاق',reference:'Sahih al-Bukhari 13'},
      {id:'bukhari-6013',text:'مَنْ لاَ يَرْحَمْ لاَ يُرْحَمْ',narrator:'جرير بن عبد الله رضي الله عنه',source:'صحيح البخاري',hadithNumber:'6013',grade:'صحيح',category:'الرحمة',reference:'صحيح البخاري 6013 — كتاب الأدب'}
    ]),
    dua:Object.freeze([
      {id:'hisn-sleep-1',text:'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',occasion:'قبل النوم',source:'صحيح البخاري',repeatCount:1,category:'قبل النوم',reference:'صحيح البخاري 6324'},
      {id:'hisn-wake-1',text:'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',occasion:'الاستيقاظ',source:'صحيح البخاري',repeatCount:1,category:'الاستيقاظ',reference:'صحيح البخاري 6312'},
      {id:'hisn-toilet-out',text:'غُفْرَانَكَ',occasion:'الخروج من الخلاء',source:'سنن أبي داود',repeatCount:1,category:'الخروج',reference:'سنن أبي داود 30'},
      {id:'hisn-home-out',text:'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، لاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ',occasion:'الخروج من المنزل',source:'سنن أبي داود',repeatCount:1,category:'الخروج',reference:'سنن أبي داود 5095'}
    ])
  });
})(globalThis);
