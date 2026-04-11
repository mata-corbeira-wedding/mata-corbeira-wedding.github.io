document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector(".nav-toggle");
  const navLinksWrapper = document.querySelector(".nav-links-wrapper");

  if (navToggle && navLinksWrapper) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinksWrapper.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinksWrapper.addEventListener("click", (event) => {
      if (event.target instanceof HTMLElement && event.target.matches(".nav-link")) {
        navLinksWrapper.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  if ("scrollBehavior" in document.documentElement.style === false) {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href");
        if (!targetId || targetId === "#") return;
        const target = document.querySelector(targetId);
        if (!target) return;

        event.preventDefault();
        const rect = target.getBoundingClientRect();
        const offset = window.scrollY + rect.top - 80;
        window.scrollTo({ top: offset, behavior: "smooth" });
      });
    });
  }

  const translations = {
    en: {
      brand_names: "Maria & Raynulfo",
      brand_date: "December 29th, 2026",
      nav_home: "Home",
      nav_wedding_day: "Wedding Day",
      nav_registry: "Registry",
      nav_hotel: "Stay",
      nav_things_to_do: "Things To Do",
      home_rsvp_button: "RSVP",
      home_names_line1: "Maria Alejandra",
      home_names_line2: "Corbeira Raventos",
      home_names_amp: "&",
      home_names_line3: "Raynulfo Jesus",
      home_names_line4: "Mata Negrette",
      home_date_location:
        "December 29th 2026 · Ancient Spanish Monastery · North Miami Beach, Florida",
      home_ceremony_title: "Ceremony",
      home_ceremony_time: "4:00 PM · Chapel of St. Bernard de Clairvaux",
      home_cocktail_title: "Cocktail Hour",
      home_cocktail_time: "5:00 PM · Cloister Garden",
      home_reception_title: "Celebration",
      home_reception_time: "6:30 PM · Refectory & Courtyard",
      home_transport:
        "Parking at the monastery is limited. We kindly recommend using Uber, Lyft, or shared rides when possible.",
      wedding_kicker: "Wedding Day",
      wedding_title: "Wedding Day Information",
      wedding_subtitle:
        "Everything you need to know for our celebration at the Ancient Spanish Monastery.",
      wedding_timeline_title: "Schedule & Flow",
      wedding_timeline_ceremony_time: "4:00 PM",
      wedding_timeline_ceremony_title: "Catholic Ceremony",
      wedding_timeline_ceremony_desc:
        "Please arrive 20–30 minutes early to find your seat in the historic chapel.",
      wedding_timeline_cocktail_time: "5:00 PM",
      wedding_timeline_cocktail_title: "Cocktail Hour",
      wedding_timeline_cocktail_desc:
        "Join us in the cloister gardens for cocktails, music, and a first look at the monastery at sunset.",
      wedding_timeline_reception_time: "6:30 PM",
      wedding_timeline_reception_title: "Dinner & Celebration",
      wedding_timeline_reception_desc:
        "Dinner, speeches, and dancing in the refectory and courtyard beneath the arches and oak trees.",
      wedding_child_free_title: "Child Free Affair",
      wedding_child_free_body:
        "While we adore your little ones, our wedding is going to be an adults-only event so that everyone can relax and enjoy the evening. We appreciate you making arrangements ahead of time to celebrate with us!",
      wedding_dress_code_title: "Dress Code: Formal Evening Attire",
      wedding_dress_code_intro: "We invite you to dress in your finest formal evening wear.",
      wedding_dress_code_bold: "To honor the bride's traditional attire, we kindly ask that guests refrain from wearing white, cream, or ivory.",
      wedding_dress_code_venue_label: "Note on the Venue:",
      wedding_dress_code_venue_note:
        "The monastery features historic stone floors and garden paths; we recommend block heels or comfortable shoes. December evenings in Miami can be breezy, so a light wrap or jacket is suggested.",
      wedding_venue_title: "Venue & Directions",
      wedding_venue_body:
        "The Ancient Spanish Monastery is a historic cloister with several distinct spaces. The chapel, gardens, and reception hall are a short walk from one another within the same grounds.",
      wedding_venue_item_chapel:
        "Chapel entrance: main church doors facing the front courtyard.",
      wedding_venue_item_cocktail: "Cocktail: cloister garden just beyond the chapel.",
      wedding_venue_item_reception: "Reception: refectory hall and adjoining courtyard.",
      wedding_venue_map_caption:
        "Monastery map: chapel, cocktail area, and reception.",
      wedding_monastery_button: "Visit Monastery Website",
      wedding_transport_title: "Parking & Transportation",
      wedding_transport_body:
        "Parking at the monastery is limited. If you are able, please consider taking Uber, Lyft, or carpooling. If you do drive, allow extra time to park and walk through the gardens to the chapel.",
      registry_kicker: "Registry",
      registry_title: "Gifts & Registry",
      registry_subtitle:
        "Your presence is the greatest gift. If you would also like to honor us with a present, we have gathered a few ideas below.",
      registry_amazon_title: "Amazon Registry",
      registry_amazon_body:
        "We have selected a small collection of items for our home. You can view the full list on Amazon.",
      registry_amazon_button: "View Amazon Registry",
      registry_fund_title: "Honeymoon & Future Home Fund",
      registry_fund_body:
        "For those who prefer, you may contribute to our honeymoon and future home fund. We are deeply grateful for any gesture.",
      registry_zelle_label: "Zelle:",
      registry_zelle_note:
        "Send to this number via your bank's Zelle app.",
      registry_other_title: "Other Ideas",
      registry_other_body:
        "If you prefer to share a gift in another way, please feel welcome to reach out to our families or to us directly. We are simply honored to celebrate with you.",
      hotel_kicker: "Stay",
      hotel_title: "Where to stay?",
      hotel_subtitle:
        "Here are some hotels we suggest for your stay in Miami. These are simply recommendations — you are more than welcome to choose any hotel that is most convenient for you!",
      hotel_airbnb_title: "Airbnb & Vacation Rentals",
      hotel_airbnb_body:
        "Airbnb and other vacation rentals are widely available across Miami. If you'd like to share a rental with other guests to split costs, please reach out to the bride or groom and we'll do our best to connect you with other friends and family looking for a shared stay!",
      hotel_group_venue_title: "Near the Ancient Spanish Monastery · Aventura Area",
      hotel_group_doral_title: "Near Doral",
      hotel_group_miramar_title: "Near Miramar",
      hotel_link_website: "View Hotel",
      hotel_aventura1_desc: "A reliable 3-star choice steps from Aventura Mall, with comfortable rooms and solid amenities for a wedding weekend.",
      hotel_aventura1_price: "~$275 per night",
      hotel_aventura1_highlights: "Heated outdoor pool · On-site restaurant & bar · Bicycle rentals",
      hotel_aventura2_desc: "A stylish 4-star European-inspired hotel with a rooftop pool and bar — a great option for guests who want a little extra luxury.",
      hotel_aventura2_price: "~$245 per night",
      hotel_aventura2_highlights: "Rooftop pool & bar · AC Kitchen breakfast · Pet-friendly",
      hotel_aventura3_desc: "A beachfront resort with direct ocean access — ideal for guests who want to combine the wedding with a beach getaway.",
      hotel_aventura3_price: "~$235 per night",
      hotel_aventura3_highlights: "Direct beach access · Oceanfront pool · Poolside bar & restaurant",
      hotel_doral1_desc: "An eco-conscious extended-stay hotel with fully equipped kitchens — great value for guests planning a longer trip.",
      hotel_doral1_price: "~$159 per night",
      hotel_doral1_highlights: "Fully equipped kitchens · Free healthy breakfast · Free airport shuttle · Pet-friendly",
      hotel_doral2_desc: "A reliable and comfortable choice close to local dining and shopping, with generous breakfast included.",
      hotel_doral2_price: "~$175 per night",
      hotel_doral2_highlights: "Free breakfast buffet · 24/7 café & bar · Outdoor pool · Pet-friendly",
      hotel_doral3_desc: "All-suite rooms with separate living areas — perfect for guests who want extra space to get ready for the big day.",
      hotel_doral3_price: "~$193 per night",
      hotel_doral3_highlights: "Free hot breakfast · Free parking · Outdoor pool",
      hotel_miramar1_desc: "A well-rounded option with on-site dining and free parking — one of the most affordable picks for the weekend.",
      hotel_miramar1_price: "~$136 per night",
      hotel_miramar1_highlights: "On-site restaurant & bar · Outdoor pool · Free parking · Pet-friendly",
      hotel_miramar2_desc: "A straightforward and comfortable stay with free breakfast and parking included — great for budget-conscious guests.",
      hotel_miramar2_price: "~$179 per night",
      hotel_miramar2_highlights: "Free breakfast buffet · Outdoor pool · Free self-parking · Mini-fridges & microwaves",
      hotel_miramar3_desc: "Spacious suites with full kitchens and a saline pool — ideal for families or guests who want a home-away-from-home feel.",
      hotel_miramar3_price: "~$177 per night",
      hotel_miramar3_highlights: "Full kitchen suites · Free hot breakfast · Saline pool · Pet-friendly",
      footer_text_before: "With love from",
      footer_text_after: "We cannot wait to celebrate with you at the Ancient Spanish Monastery.",
      rsvp_title: "RSVP",
      rsvp_intro:
        "Please confirm your attendance by entering your phone number and letting us know if you will join us.",
      rsvp_country_label: "Country / Area Code",
      rsvp_phone_label: "Phone Number",
      rsvp_phone_placeholder: "123 456 7890",
      rsvp_attending_label: "Will you attend?",
      rsvp_attending_yes: "Yes, I will be there",
      rsvp_attending_no: "No, I am unable to attend",
      rsvp_notes_label: "Allergies, Dietary preference, other",
      rsvp_submit_label: "Submit RSVP",
      rsvp_footer_note: "RSVP submissions are collected securely via Google Forms.",
      rsvp_search_button: "Find My Group",
      rsvp_not_found: "No guest found with that number. Please try again.",
      rsvp_loading: "Searching\u2026",
      rsvp_group_intro: "Select who will be attending:",
      rsvp_back_button: "Back",
      rsvp_submitting: "Submitting\u2026",
      rsvp_success: "Your RSVP has been recorded. Thank you!",
      rsvp_attend_yes: "Attending",
      rsvp_attend_no: "Not attending",
      things_kicker: "Explore",
      things_title: "Things To Do",
      things_subtitle:
        "Make a mini-vacation of your trip. Here are ideas to help you enjoy Miami before and after the wedding.",
      things_transport:
        "Miami has very limited to no public transportation. It is highly recommended to rent a car to fully explore the city and get around comfortably during your stay.",
      things_item1_title: "Wynwood Walls",
      things_item1_body:
        "This is the heart of Miami's urban art scene and a must-see for anyone wanting to see the city's modern, creative side. Features massive, colorful murals by world-renowned street artists. The surrounding neighborhood is filled with trendy galleries and craft breweries.",
      things_item2_title: "Vizcaya Museum & Gardens",
      things_item2_body:
        "A stunning historic estate that feels like a European palace dropped into the middle of a tropical jungle. Showcases a 1914 Italian Renaissance-style mansion with elaborate formal gardens and breathtaking views overlooking Biscayne Bay.",
      things_item3_title: "Miami Design District",
      things_item3_body:
        "This is where high fashion meets architectural innovation, perfect for those who appreciate luxury and design. Home to flagship stores for the world's most prestigious fashion brands, dotted with public art installations and sleek, modern architecture.",
      things_item4_title: "Little Havana & Calle Ocho",
      things_item4_body:
        "This is the soul of Miami's Cuban community and provides the most authentic international experience in the city. Known for the Walk of Fame honoring Latin stars and the famous Domino Park, filled with the scents of Cuban coffee (cafecitos) and hand-rolled cigars.",
      things_item5_title: "Fairchild Tropical Botanic Garden",
      things_item5_body:
        "A lush, 83-acre paradise that showcases the unique flora of South Florida. Features rare tropical plants, a butterfly conservatory, and sunken gardens. Tram tours are available to explore the vast grounds comfortably.",
      things_item6_title: "Phillip & Patricia Frost Museum of Science",
      things_item6_body:
        "A world-class facility located in Downtown Miami that is both educational and visually spectacular. Features a three-level aquarium and a state-of-the-art planetarium, with interactive exhibits on the Everglades and space exploration.",
      things_item7_title: "Pérez Art Museum Miami (PAMM)",
      things_item7_body:
        "Commonly known as PAMM, this museum focuses on international art from the 20th and 21st centuries. The building itself is an architectural marvel with hanging gardens, located directly on the water with beautiful outdoor seating areas.",
      things_item8_title: "Bayside Marketplace",
      things_item8_body:
        "An energetic waterfront festival center that serves as the gateway to the bay. Offers a mix of shops, restaurants, and daily live music. The primary spot for catching boat tours and sightseeing cruises.",
      things_item9_title: "Aventura Mall",
      things_item9_body:
        "One of the top-tier shopping destinations in the country, blending high-end retail with art. Includes a massive slide tower designed by artist Carsten Höller, with over 300 stores including luxury boutiques and major department stores.",
      things_item10_title: "Dolphin Mall",
      things_item10_body:
        "Miami's largest outlet shopping center, perfect for visitors looking for great deals. Provides over 240 retail outlets and brand-name discounters, with an extensive entertainment zone with a cinema and bowling.",
      things_item11_title: "Sawgrass Mills",
      things_item11_body:
        "Located slightly north in Sunrise, this is one of the largest outlet malls in the world. Known for The Colonnade Outlets, which features luxury brands at outlet prices — a true destination for serious shoppers coming from overseas.",
      things_item12_title: "Miami Beach",
      things_item12_body:
        "Miami Beach offers a more relaxed vibe as you move further north. Beautiful white sand beaches with a lively atmosphere, great dining, and vibrant nightlife.",
      things_item13_title: "South Beach",
      things_item13_body:
        "South Beach is the southern tip, famous for Ocean Drive and its neon lights. The iconic Art Deco architecture lines the streets just steps from the sand, and the energy here is unlike anywhere else in Miami.",
      things_item14_title: "Hollywood Beach Broadwalk",
      things_item14_body:
        "A classic Florida boardwalk experience that is perfect for families and long walks. Features a 2.5-mile pedestrian promenade right on the Atlantic Ocean, lined with cozy cafes, ice cream shops, and oceanfront parks.",
      things_item15_title: "Dania Beach",
      things_item15_body:
        "A quieter, more natural beach alternative located just south of Fort Lauderdale. Home to a popular fishing pier and beautiful dunes — perfect for those looking to escape the heavier crowds of Miami.",
    },
    es: {
      brand_names: "Maria y Raynulfo",
      brand_date: "29 de diciembre de 2026",
      nav_home: "Inicio",
      nav_wedding_day: "El Gran Día",
      nav_registry: "Regalos",
      nav_hotel: "Hospedaje",
      nav_things_to_do: "Qué Hacer",
      home_rsvp_button: "Confirmar asistencia",
      home_names_line1: "Maria Alejandra",
      home_names_line2: "Corbeira Raventos",
      home_names_amp: "y",
      home_names_line3: "Raynulfo Jesus",
      home_names_line4: "Mata Negrette",
      home_date_location:
        "29 de diciembre de 2026 · Ancient Spanish Monastery · North Miami Beach, Florida",
      home_ceremony_title: "Ceremonia",
      home_ceremony_time: "4:00 p. m. · Capilla de San Bernardo de Claraval",
      home_cocktail_title: "Coctel",
      home_cocktail_time: "5:00 p. m. · Jardines del claustro",
      home_reception_title: "Celebración",
      home_reception_time: "6:30 p. m. · Refectorio y patio",
      home_transport:
        "El estacionamiento en el monasterio es limitado. Les recomendamos usar Uber, Lyft o compartir carro siempre que sea posible.",
      wedding_kicker: "El Gran Día",
      wedding_title: "Información del día de la boda",
      wedding_subtitle:
        "Todo lo que necesitas saber para celebrar con nosotros en el Ancient Spanish Monastery.",
      wedding_timeline_title: "Horario y recorrido",
      wedding_timeline_ceremony_time: "4:00 p. m.",
      wedding_timeline_ceremony_title: "Ceremonia católica",
      wedding_timeline_ceremony_desc:
        "Te pedimos llegar 20–30 minutos antes para encontrar tu puesto en la capilla histórica.",
      wedding_timeline_cocktail_time: "5:00 p. m.",
      wedding_timeline_cocktail_title: "Coctel",
      wedding_timeline_cocktail_desc:
        "Acompáñanos en los jardines del claustro para cocteles, música y la magia del atardecer en el monasterio.",
      wedding_timeline_reception_time: "6:30 p. m.",
      wedding_timeline_reception_title: "Cena y fiesta",
      wedding_timeline_reception_desc:
        "Cena, brindis y baile en el refectorio y el patio, bajo los arcos y el gran roble.",
      wedding_child_free_title: "Evento Solo para Adultos",
      wedding_child_free_body:
        "Aunque adoramos a sus pequeños, nuestra boda será un evento exclusivo para adultos para que todos puedan relajarse y disfrutar de la noche. ¡Agradecemos que hagan los arreglos con anticipación para celebrar con nosotros!",
      wedding_dress_code_title: "Código de vestimenta: Etiqueta de Noche",
      wedding_dress_code_intro: "Los invitamos a vestir con su mejor ropa de etiqueta.",
      wedding_dress_code_bold: "Para honrar el atuendo tradicional de la novia, pedimos amablemente que los invitados eviten usar blanco, crema o marfil.",
      wedding_dress_code_venue_label: "Nota sobre el lugar:",
      wedding_dress_code_venue_note:
        "El monasterio tiene pisos históricos de piedra y senderos en el jardín; recomendamos tacones anchos o zapatos cómodos. Las noches de diciembre en Miami pueden ser frescas, así que se sugiere un chal o saco ligero.",
      wedding_venue_title: "El lugar y cómo llegar",
      wedding_venue_body:
        "El Ancient Spanish Monastery es un claustro histórico con varios espacios. La capilla, los jardines y el salón de recepción están a pocos pasos unos de otros dentro del mismo recinto.",
      wedding_venue_item_chapel:
        "Entrada a la capilla: puertas principales de la iglesia frente al patio de entrada.",
      wedding_venue_item_cocktail:
        "Coctel: jardines del claustro justo después de la capilla.",
      wedding_venue_item_reception:
        "Recepción: salón del refectorio y patio contiguo.",
      wedding_venue_map_caption:
        "Mapa del monasterio: capilla, área de coctel y recepción.",
      wedding_monastery_button: "Visitar sitio del monasterio",
      wedding_transport_title: "Transporte y estacionamiento",
      wedding_transport_body:
        "El estacionamiento en el monasterio es limitado. Si puedes, considera venir en Uber, Lyft o compartiendo carro. Si manejas, llega con tiempo para estacionar y caminar por los jardines hasta la capilla.",
      registry_kicker: "Regalos",
      registry_title: "Regalos y mesa de bodas",
      registry_subtitle:
        "Su presencia es el regalo más importante. Si además desean honrarnos con un obsequio, les compartimos algunas opciones.",
      registry_amazon_title: "Lista en Amazon",
      registry_amazon_body:
        "Hemos escogido algunos detalles para nuestro hogar. Puedes ver la lista completa en Amazon.",
      registry_amazon_button: "Ver lista en Amazon",
      registry_fund_title: "Fondo de luna de miel y hogar",
      registry_fund_body:
        "Si lo prefieres, puedes contribuir a nuestra luna de miel y a nuestro futuro hogar. Agradecemos de corazón cualquier detalle.",
      registry_zelle_label: "Zelle:",
      registry_zelle_note:
        "Envía a este número desde la app Zelle de tu banco.",
      registry_other_title: "Otras ideas",
      registry_other_body:
        "Si prefieres compartir un regalo de otra forma, siéntete libre de hablar con nuestras familias o con nosotros directamente. Lo más importante para nosotros es celebrar contigo.",
      hotel_kicker: "Hospedaje",
      hotel_title: "¿Dónde hospedarse?",
      hotel_subtitle:
        "Aquí hay algunos hoteles que sugerimos para tu estadía en Miami. Estas son simplemente recomendaciones — ¡eres más que bienvenido a elegir el hotel que sea más conveniente para ti!",
      hotel_airbnb_title: "Airbnb y alquileres vacacionales",
      hotel_airbnb_body:
        "Los Airbnb y otros alquileres vacacionales están ampliamente disponibles en Miami. Si te gustaría compartir un alquiler con otros invitados para dividir gastos, ¡comunícate con la novia o el novio y haremos lo posible por conectarte con otros amigos y familiares que también busquen compartir!",
      hotel_group_venue_title: "Cerca del Ancient Spanish Monastery · Área de Aventura",
      hotel_group_doral_title: "Cerca de Doral",
      hotel_group_miramar_title: "Cerca de Miramar",
      hotel_link_website: "Ver Hotel",
      hotel_aventura1_desc: "Una opción confiable de 3 estrellas a pasos de Aventura Mall, con habitaciones cómodas y buenas comodidades para un fin de semana de boda.",
      hotel_aventura1_price: "~$275 por noche",
      hotel_aventura1_highlights: "Piscina exterior climatizada · Restaurante y bar en el lugar · Alquiler de bicicletas",
      hotel_aventura2_desc: "Un elegante hotel de 4 estrellas con inspiración europea, con piscina y bar en la azotea — una gran opción para quienes buscan un poco más de lujo.",
      hotel_aventura2_price: "~$245 por noche",
      hotel_aventura2_highlights: "Piscina y bar en la azotea · Desayuno en AC Kitchen · Acepta mascotas",
      hotel_aventura3_desc: "Un resort frente al mar con acceso directo al océano — ideal para quienes quieran combinar la boda con unas vacaciones en la playa.",
      hotel_aventura3_price: "~$235 por noche",
      hotel_aventura3_highlights: "Acceso directo a la playa · Piscina frente al mar · Bar y restaurante junto a la piscina",
      hotel_doral1_desc: "Un hotel ecológico de estadía extendida con cocinas totalmente equipadas — excelente relación calidad-precio para quienes planean un viaje más largo.",
      hotel_doral1_price: "~$159 por noche",
      hotel_doral1_highlights: "Cocinas totalmente equipadas · Desayuno saludable gratuito · Transporte gratuito al aeropuerto · Acepta mascotas",
      hotel_doral2_desc: "Una opción confiable y cómoda cerca de restaurantes y tiendas locales, con un generoso desayuno incluido.",
      hotel_doral2_price: "~$175 por noche",
      hotel_doral2_highlights: "Desayuno buffet gratuito · Café y bar 24/7 · Piscina exterior · Acepta mascotas",
      hotel_doral3_desc: "Habitaciones tipo suite con áreas de estar separadas — perfecto para quienes quieran espacio extra para prepararse para el gran día.",
      hotel_doral3_price: "~$193 por noche",
      hotel_doral3_highlights: "Desayuno caliente gratuito · Estacionamiento gratuito · Piscina exterior",
      hotel_miramar1_desc: "Una opción completa con restaurante en el lugar y estacionamiento gratuito — una de las opciones más económicas para el fin de semana.",
      hotel_miramar1_price: "~$136 por noche",
      hotel_miramar1_highlights: "Restaurante y bar en el lugar · Piscina exterior · Estacionamiento gratuito · Acepta mascotas",
      hotel_miramar2_desc: "Una estadía sencilla y cómoda con desayuno y estacionamiento gratuitos — excelente para invitados que buscan ahorrar.",
      hotel_miramar2_price: "~$179 por noche",
      hotel_miramar2_highlights: "Desayuno buffet gratuito · Piscina exterior · Estacionamiento gratuito · Mini-refrigeradores y microondas",
      hotel_miramar3_desc: "Suites amplias con cocinas completas y piscina salina — ideal para familias o quienes buscan sentirse como en casa.",
      hotel_miramar3_price: "~$177 por noche",
      hotel_miramar3_highlights: "Suites con cocina completa · Desayuno caliente gratuito · Piscina salina · Acepta mascotas",
      footer_text_before: "Con amor de",
      footer_text_after: "No podemos esperar para celebrar contigo en el Ancient Spanish Monastery.",
      rsvp_title: "Confirmar asistencia",
      rsvp_intro:
        "Por favor confirma tu asistencia ingresando tu número de teléfono y contándonos si podrás acompañarnos.",
      rsvp_country_label: "País / código",
      rsvp_phone_label: "Número de teléfono",
      rsvp_phone_placeholder: "123 456 7890",
      rsvp_attending_label: "¿Podrás asistir?",
      rsvp_attending_yes: "Sí, estaré allí",
      rsvp_attending_no: "No, no podré asistir",
      rsvp_notes_label: "Alergias, preferencia dietética, otro",
      rsvp_submit_label: "Enviar confirmación",
      rsvp_footer_note: "Las confirmaciones se registran de forma segura a través de Google Forms.",
      rsvp_search_button: "Buscar mi grupo",
      rsvp_not_found: "No encontramos un invitado con ese número. Intenta de nuevo.",
      rsvp_loading: "Buscando\u2026",
      rsvp_group_intro: "Selecciona quién asistirá:",
      rsvp_back_button: "Atrás",
      rsvp_submitting: "Enviando\u2026",
      rsvp_success: "¡Tu confirmación fue registrada. Gracias!",
      rsvp_attend_yes: "Asistirá",
      rsvp_attend_no: "No asistirá",
      things_kicker: "Para disfrutar",
      things_title: "Qué hacer en Miami",
      things_subtitle:
        "Aprovecha el viaje como unas mini vacaciones. Aquí compartiremos ideas para disfrutar Miami antes y después de la boda.",
      things_transport:
        "Miami tiene muy limitado o ningún transporte público. Se recomienda ampliamente alquilar un auto para explorar la ciudad y movilizarte cómodamente durante tu estadía.",
      things_item1_title: "Wynwood Walls",
      things_item1_body:
        "Es el corazón de la escena artística urbana de Miami y una visita obligada para quienes quieren descubrir el lado moderno y creativo de la ciudad. Exhibe enormes murales coloridos de artistas de renombre mundial, y el barrio circundante está lleno de galerías y cervecerías artesanales.",
      things_item2_title: "Vizcaya Museum & Gardens",
      things_item2_body:
        "Una impresionante finca histórica que parece un palacio europeo en medio de la jungla tropical. Presenta una mansión de estilo renacentista italiano de 1914 con elaborados jardines formales y vistas espectaculares de la Bahía Biscayne.",
      things_item3_title: "Miami Design District",
      things_item3_body:
        "Aquí la alta moda se encuentra con la innovación arquitectónica, ideal para quienes aprecian el lujo y el diseño. Alberga tiendas insignia de las marcas de moda más prestigiosas del mundo, con instalaciones de arte público y arquitectura moderna.",
      things_item4_title: "La Pequeña Habana y Calle Ocho",
      things_item4_body:
        "El alma de la comunidad cubana de Miami y la experiencia internacional más auténtica de la ciudad. Famosa por el Paseo de la Fama latino y el Domino Park, impregnada del aroma del café cubano (cafecitos) y puros artesanales.",
      things_item5_title: "Fairchild Tropical Botanic Garden",
      things_item5_body:
        "Un exuberante paraíso de 83 acres que muestra la flora única del sur de Florida. Cuenta con plantas tropicales raras, un conservatorio de mariposas y jardines hundidos. Se ofrecen tours en tranvía para recorrer los amplios terrenos cómodamente.",
      things_item6_title: "Phillip & Patricia Frost Museum of Science",
      things_item6_body:
        "Una instalación de clase mundial en el centro de Miami, educativa y visualmente espectacular. Cuenta con un acuario de tres niveles y un planetario de última generación, con exhibiciones interactivas sobre los Everglades y la exploración espacial.",
      things_item7_title: "Pérez Art Museum Miami (PAMM)",
      things_item7_body:
        "Conocido como PAMM, este museo se centra en arte internacional de los siglos XX y XXI. El edificio en sí es una maravilla arquitectónica con jardines colgantes, ubicado directamente frente al agua con hermosas áreas de descanso al aire libre.",
      things_item8_title: "Bayside Marketplace",
      things_item8_body:
        "Un animado centro frente al mar que sirve como puerta de entrada a la bahía. Ofrece tiendas, restaurantes y música en vivo a diario. El lugar principal para tomar tours en bote y cruceros turísticos.",
      things_item9_title: "Aventura Mall",
      things_item9_body:
        "Uno de los principales destinos de compras del país, combinando tiendas de lujo con arte. Incluye una enorme torre tobogán diseñada por el artista Carsten Höller, con más de 300 tiendas entre boutiques de lujo y grandes almacenes.",
      things_item10_title: "Dolphin Mall",
      things_item10_body:
        "El centro comercial outlet más grande de Miami, ideal para quienes buscan buenas ofertas. Ofrece más de 240 tiendas outlet y marcas reconocidas, con una extensa zona de entretenimiento con cine y boliche.",
      things_item11_title: "Sawgrass Mills",
      things_item11_body:
        "Ubicado al norte en Sunrise, es uno de los centros outlet más grandes del mundo. Conocido por The Colonnade Outlets, con marcas de lujo a precios de outlet — un verdadero destino para compradores serios que vienen del exterior.",
      things_item12_title: "Miami Beach",
      things_item12_body:
        "Miami Beach ofrece un ambiente más relajado conforme avanzas hacia el norte. Hermosas playas de arena blanca con un ambiente animado, excelente gastronomía y vibrante vida nocturna.",
      things_item13_title: "South Beach",
      things_item13_body:
        "South Beach es el extremo sur, famoso por Ocean Drive y sus luces de neón. La icónica arquitectura Art Déco bordea las calles a pasos de la arena, y la energía aquí es única en Miami.",
      things_item14_title: "Hollywood Beach Broadwalk",
      things_item14_body:
        "Una experiencia clásica de paseo marítimo en Florida, perfecta para familias y caminatas largas. Cuenta con un paseo peatonal de 2.5 millas frente al Océano Atlántico, bordeado de cafés, heladerías y parques frente al mar.",
      things_item15_title: "Dania Beach",
      things_item15_body:
        "Una alternativa de playa más tranquila y natural al sur de Fort Lauderdale. Hogar de un popular muelle de pesca y hermosas dunas — perfecta para quienes buscan escapar de las multitudes de Miami.",
    },
  };

  const langButtons = document.querySelectorAll(".lang-btn");
  let currentLang = "en";

  function applyTranslations(lang) {
    const dict = translations[lang];
    if (!dict) return;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const value = dict[key];
      if (typeof value === "string") {
        el.textContent = value;
      }
    });

    document.documentElement.lang = lang;
  }

  langButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      if (!lang || lang === currentLang) return;
      currentLang = lang;

      langButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle("is-active", isActive);
        b.setAttribute("aria-pressed", String(isActive));
      });

      applyTranslations(lang);
    });
  });

  applyTranslations(currentLang);

  // ── Country codes (inlined to avoid fetch issues with file:// protocol) ──
  const COUNTRY_CODES = [
    { code: "+1",  country: "United States / Estados Unidos", flag: "🇺🇸" },
    { code: "+34", country: "Spain / España",                 flag: "🇪🇸" },
    { code: "+58", country: "Venezuela",                      flag: "🇻🇪" },
    { code: "+57", country: "Colombia",                       flag: "🇨🇴" },
    { code: "+52", country: "Mexico / México",                flag: "🇲🇽" },
  ];

  // ── Guest list CSV (same sheet as admin) ──
  const GUESTS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpZYFkAej3ho8qCNzumNvLpIk4_3BYv_VHqWTmOtKpajYVQycLzuoW-dD6P-dymmGifDi7QC-HoUcO/pub?gid=698292239&single=true&output=csv";
  // ── Google Form submission URL ──
  // Replace with your actual form URL and entry IDs after setting up Google Form
  const GOOGLE_FORM_ACTION   = "https://docs.google.com/forms/d/e/1FAIpQLSearmpbQCMMvLZ0oLgtQHvFT-3z9aOG_MSzc1gvJOJQ0TR7nQ/formResponse";
  const FORM_ENTRY_NAME      = "entry.1498135098";
  const FORM_ENTRY_ATTENDING = "entry.877086558";
  const FORM_ENTRY_NOTES     = "entry.1424661284";
  const FORM_FBZ             = "7073025226565571995";

  // ── CSV utilities ──
  function normalizePhone(raw) {
    if (!raw) return "";
    return String(raw).replace(/[^\d+]/g, "");
  }

  function parseCsvLine(line) {
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let field = "";
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            field += '"';
            i += 2;
          } else if (line[i] === '"') {
            i++; // skip closing quote
            break;
          } else {
            field += line[i++];
          }
        }
        fields.push(field);
        if (line[i] === ",") i++;
      } else {
        const end = line.indexOf(",", i);
        if (end === -1) {
          fields.push(line.slice(i));
          break;
        }
        fields.push(line.slice(i, end));
        i = end + 1;
      }
    }
    return fields;
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = parseCsvLine(lines[0]).map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (values[idx] || "").trim();
      });
      return obj;
    });
  }

  async function fetchCsv(url) {
    if (!url || url.startsWith("YOUR_")) return [];
    const cacheBuster = url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
    const res = await fetch(cacheBuster);
    if (!res.ok) return [];
    const text = await res.text();
    return parseCsv(text);
  }

  // ── DOM refs ──
  const rsvpModal      = document.getElementById("rsvp-modal");
  const rsvpOpenButton = document.querySelector(".hero-rsvp-button");
  const rsvpCloseTargets = document.querySelectorAll("[data-rsvp-close]");
  const countrySelect  = document.getElementById("rsvp-country");
  const phoneInput     = document.getElementById("rsvp-phone");
  const step1El        = document.getElementById("rsvp-step-1");
  const step2El        = document.getElementById("rsvp-step-2");
  const searchBtn      = document.getElementById("rsvp-search-btn");
  const lookupMsgEl   = document.getElementById("rsvp-lookup-message");
  const groupListEl    = document.getElementById("rsvp-group-list");
  const groupIntroEl   = step2El ? step2El.querySelector("[data-i18n='rsvp_group_intro']") : null;
  const notesEl        = document.getElementById("rsvp-notes");
  const backBtn        = document.getElementById("rsvp-back-btn");
  const submitBtn      = document.getElementById("rsvp-submit-btn");
  const submitMsgEl    = document.getElementById("rsvp-submit-message");

  // ── Populate country code dropdown ──
  if (countrySelect) {
    COUNTRY_CODES.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.code;
      option.textContent = `${entry.flag} ${entry.code} — ${entry.country}`;
      countrySelect.appendChild(option);
    });
  }

  // ── Modal open / close ──
  function openRsvp() {
    if (!rsvpModal) return;
    rsvpModal.classList.add("is-open");
    rsvpModal.setAttribute("aria-hidden", "false");
    if (phoneInput) phoneInput.focus();
  }

  function closeRsvp() {
    if (!rsvpModal) return;
    rsvpModal.classList.remove("is-open");
    rsvpModal.setAttribute("aria-hidden", "true");
    // Reset to Step 1
    if (step1El) step1El.hidden = false;
    if (step2El) step2El.hidden = true;
    if (phoneInput) phoneInput.value = "";
    if (lookupMsgEl) lookupMsgEl.textContent = "";
    if (groupListEl) { groupListEl.innerHTML = ""; groupListEl.style.display = ""; }
    if (groupIntroEl) groupIntroEl.style.display = "";
    if (notesEl) { notesEl.value = ""; notesEl.closest(".rsvp-field").style.display = ""; }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.display = ""; }
    if (submitMsgEl) submitMsgEl.textContent = "";
  }

  if (rsvpOpenButton) rsvpOpenButton.addEventListener("click", openRsvp);

  rsvpCloseTargets.forEach((el) => el.addEventListener("click", closeRsvp));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeRsvp();
  });

  // ── Guest list cache ──
  let guestList = [];

  async function ensureGuestList() {
    guestList = await fetchCsv(GUESTS_CSV_URL);
  }

  // ── Step 1 → search ──
  if (searchBtn) {
    searchBtn.addEventListener("click", async () => {
      if (!countrySelect || !phoneInput) return;
      const code  = countrySelect.value || "";
      const local = phoneInput.value.trim();
      if (!local) {
        if (lookupMsgEl) lookupMsgEl.textContent = translations[currentLang].rsvp_not_found;
        return;
      }
      const fullPhone = normalizePhone(code + local);

      if (lookupMsgEl) lookupMsgEl.textContent = translations[currentLang].rsvp_loading;
      searchBtn.disabled = true;

      await ensureGuestList();

      searchBtn.disabled = false;

      const matched = guestList.find((g) => {
        const gPhone = normalizePhone(g["Phone #"] || g.Phone || "");
        return gPhone === fullPhone;
      });

      if (!matched) {
        if (lookupMsgEl) lookupMsgEl.textContent = translations[currentLang].rsvp_not_found;
        return;
      }

      if (lookupMsgEl) lookupMsgEl.textContent = "";

      const groupId = matched["Group ID"] || matched.GroupNumber || matched.group || "";
      const groupGuests = groupId
        ? guestList.filter((g) => (g["Group ID"] || g.GroupNumber || g.group || "") === groupId)
        : [matched];

      renderGroupList(groupGuests);
      if (step1El) step1El.hidden = true;
      if (step2El) step2El.hidden = false;
      if (submitBtn) submitBtn.disabled = false;
      if (submitMsgEl) submitMsgEl.textContent = "";
    });
  }

  // ── Render group member checklist ──
  function renderGroupList(guests) {
    if (!groupListEl) return;
    groupListEl.innerHTML = "";
    const lang = currentLang;

    // Pre-fill notes from the first group member who has a prior response
    let prefilledNotes = "";

    guests.forEach((g, i) => {
      const name = `${g.Nombre || g.FirstName || ""} ${g.Apellido || g.LastName || ""}`.trim();

      // Read attending status and allergies directly from the guest list row
      const attending = String(g.RVSP || g.RSVP || "").trim().toLowerCase();
      const isYes = attending === "yes" || attending === "sí" || attending === "si";
      const isNo  = attending === "no";

      if (!prefilledNotes) {
        const allergies = (g.Allergies || "").trim();
        if (allergies && allergies.toLowerCase() !== "no allergies") {
          prefilledNotes = allergies;
        }
      }
      const hasResponse = isYes || isNo;

      const row = document.createElement("div");
      row.className = "rsvp-guest-row";

      row.innerHTML = `
        <label class="rsvp-guest-name">
          <input type="checkbox" class="rsvp-guest-check" id="rsvp-guest-${i}" ${hasResponse ? "checked" : ""} />
          <span>${name}</span>
        </label>
        <div class="rsvp-guest-attend">
          <label>
            <input type="radio" name="rsvp-attend-${i}" value="yes" ${isYes ? "checked" : ""} />
            <span data-attend-yes>${translations[lang].rsvp_attend_yes}</span>
          </label>
          <label>
            <input type="radio" name="rsvp-attend-${i}" value="no" ${isNo ? "checked" : ""} />
            <span data-attend-no>${translations[lang].rsvp_attend_no}</span>
          </label>
        </div>
      `;

      groupListEl.appendChild(row);
    });

    if (notesEl) {
      notesEl.value = prefilledNotes;
    }
  }

  // ── Step 2 → back ──
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (step2El) step2El.hidden = true;
      if (step1El) step1El.hidden = false;
    });
  }

  // ── Step 2 → submit ──
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      if (!groupListEl) return;
      const notes = notesEl ? notesEl.value.trim() : "";
      const rows  = groupListEl.querySelectorAll(".rsvp-guest-row");
      const entries = [];

      rows.forEach((row, i) => {
        const checkbox = row.querySelector(`#rsvp-guest-${i}`);
        if (!checkbox || !checkbox.checked) return;
        const nameSpan   = row.querySelector("label.rsvp-guest-name span");
        const name       = nameSpan ? nameSpan.textContent.trim() : "";
        const attendRadio = row.querySelector(`input[name="rsvp-attend-${i}"]:checked`);
        const attendingRaw = attendRadio ? attendRadio.value : "yes";
        const attending  = attendingRaw === "yes" ? "Yes" : "No";
        entries.push({ name, attending, notes });
      });

      if (entries.length === 0) return;

      if (submitMsgEl) submitMsgEl.textContent = translations[currentLang].rsvp_submitting;
      submitBtn.disabled = true;

      try {
        if (!GOOGLE_FORM_ACTION.startsWith("YOUR_")) {
          const promises = entries.map(({ name, attending, notes: n }) => {
            const body = new URLSearchParams({
              [FORM_ENTRY_NAME]:      name,
              [FORM_ENTRY_ATTENDING]: attending,
              [FORM_ENTRY_NOTES]:     n,
              fvv:         "1",
              pageHistory: "0",
              fbzx:        FORM_FBZ,
            });
            return fetch(GOOGLE_FORM_ACTION, { method: "POST", mode: "no-cors", body });
          });
          await Promise.all(promises);
        }
        if (submitMsgEl) submitMsgEl.textContent = translations[currentLang].rsvp_success;
        // Hide form content — only success message + back button remain
        if (groupIntroEl) groupIntroEl.style.display = "none";
        if (groupListEl) groupListEl.style.display = "none";
        if (notesEl) notesEl.closest(".rsvp-field").style.display = "none";
        if (submitBtn) submitBtn.style.display = "none";
      } catch (_err) {
        if (submitMsgEl) submitMsgEl.textContent = translations[currentLang].rsvp_error || "Something went wrong. Please try again.";
        submitBtn.disabled = false;
      }
    });
  }
});


