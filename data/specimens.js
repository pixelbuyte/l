/*
 * specimens.js — contrast set.
 *
 * BE CLEAR ABOUT WHAT THESE ARE. They were written for this project in the
 * register that unedited model output tends to occupy. They were not sampled
 * from any model, and they are not evidence about any particular system.
 *
 * They exist so that every comparison on the corpus page is reproducible from
 * files in this repository: you can read both sides, recompute both columns,
 * and disagree with the selection. A scraped set of real model output would
 * be better evidence and worse as a public artefact — it could not be
 * republished, and it would be stale within a year.
 *
 * Read the gap between the two columns as illustrative of a style, not as a
 * measurement of a population.
 */
(function (root) {
  'use strict';

  var HW = (root.HW = root.HW || {});

  var SPECIMENS = [

    { id: 'spec-remote', title: 'The Future of Remote Work',
      prompt: 'Write a blog post about remote work.',
      text:
"In today's fast-paced world, the landscape of work has undergone a profound transformation. Remote work has emerged as not only a temporary solution but also a fundamental shift in how organizations operate. It's important to note that this transition represents a paradigm shift that will continue to shape the future of employment.\n\nFurthermore, companies that leverage robust remote infrastructure are better positioned to attract top talent. By fostering a culture of trust and accountability, organizations can unlock the potential of distributed teams. Moreover, the flexibility inherent in remote arrangements plays a crucial role in employee satisfaction and retention.\n\nHowever, it is essential to acknowledge the challenges. Navigating the complexities of asynchronous communication requires a delicate balance. Additionally, maintaining team cohesion in a virtual environment demands intentional effort and cutting-edge collaboration tools.\n\nIn conclusion, remote work is more than just a trend — it is a transformative force reshaping the modern workplace. By understanding these dynamics, organizations can embark on a journey toward a more flexible and resilient future." },

    { id: 'spec-sourdough', title: 'A Guide to Sourdough',
      prompt: 'Write an introduction to baking sourdough bread.',
      text:
"Sourdough baking is a rich tapestry of tradition, science, and patience. Whether you're a seasoned baker or just starting your culinary journey, understanding the fundamentals is crucial to achieving that perfect loaf.\n\nAt its core, sourdough relies on a symbiotic relationship between wild yeast and lactic acid bacteria. This intricate ecosystem, cultivated in your starter, serves as the cornerstone of flavour development. It's worth noting that temperature plays a vital role in fermentation, and even minor variations can significantly impact your results.\n\nThe process involves several key stages. First and foremost, you must maintain a healthy starter. Additionally, proper hydration levels are paramount to achieving the ideal crumb structure. Moreover, the art of shaping requires meticulous attention to detail.\n\nUltimately, sourdough baking is a testament to the beauty of slow food. By embracing the process and learning from each bake, you can elevate your baking to new heights. Remember that every loaf is a learning opportunity." },

    { id: 'spec-productivity', title: 'Five Habits of Productive People',
      prompt: 'Write a listicle about productivity habits.',
      text:
"In an increasingly competitive world, productivity has become a crucial differentiator. It's no secret that the most successful individuals share certain habits that enable them to consistently deliver exceptional results.\n\nFirst and foremost, they prioritise ruthlessly. Rather than attempting to tackle a myriad of tasks simultaneously, they focus on what truly matters. Additionally, they leverage time-blocking to create dedicated periods of deep work.\n\nSecondly, productive individuals cultivate robust morning routines. This foundational practice sets the tone for the entire day and fosters a sense of momentum. Furthermore, it's important to note that consistency is more valuable than intensity.\n\nThirdly, they embrace strategic rest. Contrary to popular belief, rest is not the opposite of productivity — it is an integral component of sustainable performance.\n\nAt the end of the day, productivity is not about doing more; it's about doing what matters. By implementing these habits, you can unlock your potential and navigate the challenges of modern professional life with greater ease." },

    { id: 'spec-startup', title: 'Why Our Series A Matters',
      prompt: 'Write a funding announcement blog post.',
      text:
"Today marks a pivotal milestone in our journey. We're thrilled to announce that we have raised $12 million in Series A funding, led by investors who share our unwavering commitment to transforming the industry.\n\nWhen we started this company three years ago, we recognised that the existing landscape was fundamentally broken. Businesses were navigating a plethora of disconnected tools, and there was no seamless solution that could streamline their workflows holistically.\n\nOur platform serves as a testament to what's possible when cutting-edge technology meets deep customer empathy. By harnessing the power of machine learning, we've built a robust system that empowers teams to work smarter, not harder.\n\nThis funding will enable us to accelerate product development, expand our world-class team, and continue delivering exceptional value to our customers. Moreover, it validates the transformative vision that has guided us from day one.\n\nWe're just getting started, and we couldn't be more excited about what lies ahead." },

    { id: 'spec-climate', title: 'Urban Green Spaces and Climate',
      prompt: 'Write an informative article about urban parks and climate resilience.',
      text:
"Urban green spaces play a vital role in building climate resilience within our cities. As temperatures continue to rise, these areas serve as critical infrastructure that mitigates a wide range of environmental challenges.\n\nIt is important to note that trees provide substantial cooling benefits. Through evapotranspiration and shade provision, urban canopy can significantly reduce ambient temperatures. Furthermore, green spaces facilitate stormwater absorption, thereby reducing the burden on drainage systems.\n\nAdditionally, these spaces foster biodiversity within the urban ecosystem. They provide essential habitat corridors that enable species to navigate the fragmented landscape of the modern city.\n\nHowever, it should be noted that not all green spaces are created equal. The design, maintenance, and accessibility of these areas are paramount to realising their full potential. Moreover, equitable distribution remains a persistent challenge across many municipalities.\n\nIn conclusion, investing in urban green infrastructure is not merely an aesthetic choice — it is a crucial component of any comprehensive climate strategy." },

    { id: 'spec-review', title: 'Product Review: Wireless Headphones',
      prompt: 'Write a review of a pair of wireless headphones.',
      text:
"These headphones represent a compelling blend of performance and value in an increasingly crowded market. After extensive testing, it's clear that they deliver a robust listening experience across a myriad of use cases.\n\nThe sound quality is exceptional. The bass response is rich without being overwhelming, and the mid-range clarity is genuinely impressive. Additionally, the active noise cancellation performs admirably in a variety of environments.\n\nComfort is another area where these headphones excel. The plush ear cushions and lightweight design facilitate extended listening sessions without fatigue. Moreover, the intuitive controls provide seamless access to essential functions.\n\nHowever, it's important to note that battery life, while adequate, falls short of some competitors. Additionally, the companion app leaves something to be desired in terms of customisation options.\n\nUltimately, these headphones offer a compelling value proposition. Whether you're a casual listener or an audiophile, they represent a solid investment that will elevate your listening experience." },

    { id: 'spec-email', title: 'Project Update Email',
      prompt: 'Write an email updating stakeholders on a project.',
      text:
"Dear Team,\n\nI hope this message finds you well. I wanted to take a moment to provide a comprehensive update on the status of our ongoing initiative.\n\nI'm pleased to report that we have made significant progress across multiple workstreams. The development team has successfully implemented the core functionality, and preliminary testing indicates robust performance. Furthermore, our stakeholder engagement efforts have yielded valuable insights that will inform the next phase.\n\nHowever, it is important to note that we have encountered some challenges with the data migration component. Navigating the complexities of the legacy system has required additional resources. Nevertheless, the team remains committed to delivering on schedule.\n\nMoving forward, we will continue to prioritise transparency and collaboration. I would like to express my sincere gratitude to everyone for their unwavering dedication.\n\nPlease don't hesitate to reach out should you have any questions or concerns.\n\nBest regards" },

    { id: 'spec-history', title: 'The Significance of the Printing Press',
      prompt: 'Write a short essay on the printing press.',
      text:
"The invention of the printing press stands as a testament to human ingenuity and represents one of the most transformative developments in the tapestry of human history. Its impact reverberates through the centuries, shaping the intellectual landscape in profound ways.\n\nPrior to Gutenberg's innovation, the reproduction of texts was a laborious endeavour undertaken by scribes. Consequently, books were prohibitively expensive and access to knowledge was severely constrained. The printing press fundamentally altered this dynamic.\n\nMoreover, the proliferation of printed materials played a crucial role in the Protestant Reformation. It's worth noting that the rapid dissemination of ideas facilitated a paradigm shift in religious and political thought throughout Europe.\n\nAdditionally, the standardisation of texts fostered the development of vernacular literature and contributed to the emergence of national identities.\n\nIn conclusion, the printing press was not merely a technological advancement — it was a catalyst that unlocked the potential for widespread literacy and irrevocably transformed the trajectory of Western civilisation." }
  ];

  HW.specimens = {
    all: SPECIMENS,
    get: function (id) {
      for (var i = 0; i < SPECIMENS.length; i++) {
        if (SPECIMENS[i].id === id) return SPECIMENS[i];
      }
      return null;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
