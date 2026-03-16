// ================================================================
//  Cardápio completo — Scooby-Doo Lanches
//  Atualizado via Excel cardapio_scooby_doo_1.xlsx
// ================================================================

const BASE = 'https://nufvtxhsckbaddurgcyx.supabase.co/storage/v1/object/public/cardapio/'

export const ADICIONAIS = [
  { id: 'add-frango',      nome: 'Frango',        preco: 13.00, emoji: '🍗' },
  { id: 'add-lombo',       nome: 'Lombo',         preco: 13.00, emoji: '🥩' },
  { id: 'add-calabresa',   nome: 'Calabresa',     preco:  6.00, emoji: '🌭' },
  { id: 'add-catupiry',    nome: 'Catupiry',      preco:  5.00, emoji: '🫕' },
  { id: 'add-cheddar',     nome: 'Cheddar',       preco:  5.00, emoji: '🧀' },
  { id: 'add-bacon',       nome: 'Bacon',         preco:  6.00, emoji: '🥓' },
  { id: 'add-bife-hamb',   nome: 'Bife Hamb',     preco:  4.00, emoji: '🍔' },
  { id: 'add-presunto',    nome: 'Presunto',      preco:  4.00, emoji: '🍖' },
  { id: 'add-queijo',      nome: 'Queijo',        preco:  6.00, emoji: '🧀' },
  { id: 'add-ovo',         nome: 'Ovo',           preco:  4.00, emoji: '🍳' },
]

export const categorias = [

  // ── HAMBÚRGUERES SIMPLES ──────────────────────────────────────
  {
    id: 'hamburgueres',
    nome: '🍔 Hambúrgueres',
    emoji: '🍔',
    itens: [
      {
        id: 1, nome: 'Hamburger',
        descricao: 'Pão, bife, salada e batata palha',
        imagem: BASE + 'SKU001_HAMBURGER.jpg',
        proteinas: [
          { label: 'Bife de Hamburguer', preco: 14.00 },
          { label: 'Filé de Frango',     preco: 20.00 },
          { label: 'Lombo de Porco',     preco: 20.00 },
        ]
      },
      {
        id: 2, nome: 'Cheese Burger',
        descricao: 'Pão, bife, mussarela, salada e batata palha',
        imagem: BASE + 'SKU002_CHEESE_BURGUER.jpg',
        proteinas: [
          { label: 'Bife de Hamburguer', preco: 19.00 },
          { label: 'Filé de Frango',     preco: 25.00 },
          { label: 'Lombo de Porco',     preco: 25.00 },
        ]
      },
      {
        id: 3, nome: 'Bacon Burger',
        descricao: 'Pão, bife, bacon, salada e batata palha',
        imagem: BASE + 'SKU003_BACON_BURGER.jpg',
        proteinas: [
          { label: 'Bife de Hamburguer', preco: 19.00 },
          { label: 'Filé de Frango',     preco: 25.00 },
          { label: 'Lombo de Porco',     preco: 25.00 },
        ]
      },
      {
        id: 4, nome: 'Egg Burger',
        descricao: 'Pão, bife, ovo, salada e batata palha',
        imagem: BASE + 'SKU004_EGG_BURGUER.jpg',
        proteinas: [
          { label: 'Bife de Hamburguer', preco: 19.00 },
          { label: 'Filé de Frango',     preco: 25.00 },
          { label: 'Lombo de Porco',     preco: 25.00 },
        ]
      },
      {
        id: 5, nome: 'Calabresa Burger',
        descricao: 'Pão, bife, calabresa, salada e batata palha',
        imagem: BASE + 'SKU005_CALABRESA_BURGUER.jpg',
        proteinas: [
          { label: 'Bife de Hamburguer', preco: 19.00 },
          { label: 'Filé de Frango',     preco: 25.00 },
          { label: 'Lombo de Porco',     preco: 25.00 },
        ]
      },
      {
        id: 6, nome: 'Cheese Egg Burger',
        descricao: 'Pão, bife, mussarela, ovo, salada e batata palha',
        imagem: BASE + 'SKU006_CHEESE_EGG_BURGUER.jpg',
        proteinas: [
          { label: 'Bife de Hamburguer', preco: 22.00 },
          { label: 'Filé de Frango',     preco: 29.00 },
          { label: 'Lombo de Porco',     preco: 29.00 },
        ]
      },
      {
        id: 7, nome: 'Cheese Bacon Burger',
        descricao: 'Pão, bife, mussarela, bacon, salada e batata palha',
        imagem: BASE + 'SKU007_CHEESE_BACON_BURGUER.jpg',
        proteinas: [
          { label: 'Bife de Hamburguer', preco: 22.00 },
          { label: 'Filé de Frango',     preco: 29.00 },
          { label: 'Lombo de Porco',     preco: 29.00 },
        ]
      },
      {
        id: 8, nome: 'Egg Bacon Burger',
        descricao: 'Pão, bife, ovo, bacon, salada e batata palha',
        imagem: BASE + 'SKU008_EGG_BACON_BURGUER.jpg',
        proteinas: [
          { label: 'Bife de Hamburguer', preco: 22.00 },
          { label: 'Filé de Frango',     preco: 29.00 },
          { label: 'Lombo de Porco',     preco: 29.00 },
        ]
      },
      {
        id: 9, nome: 'Cheese Calabresa Burger',
        descricao: 'Pão, bife, mussarela, calabresa, salada e batata palha',
        imagem: BASE + 'SKU009_CHEESE_CALABRESA_BURGUER.jpg',
        proteinas: [
          { label: 'Bife de Hamburguer', preco: 22.00 },
          { label: 'Filé de Frango',     preco: 29.00 },
          { label: 'Lombo de Porco',     preco: 29.00 },
        ]
      },
      {
        id: 10, nome: 'Egg Calabresa Burger',
        descricao: 'Pão, bife, ovo, calabresa, salada e batata palha',
        imagem: BASE + 'SKU010_EGG_CALABRESA_BURGUER.jpg',
        proteinas: [
          { label: 'Bife de Hamburguer', preco: 22.00 },
          { label: 'Filé de Frango',     preco: 29.00 },
          { label: 'Lombo de Porco',     preco: 29.00 },
        ]
      },
      {
        id: 11, nome: 'Cheese Egg Calabresa Burger',
        descricao: 'Pão, bife, ovo, mussarela, calabresa, salada e batata palha',
        imagem: BASE + 'SKU011_CHEESE_EGG_CALABRESA_BURGUER.jpg',
        proteinas: [
          { label: 'Bife de Hamburguer', preco: 25.00 },
          { label: 'Filé de Frango',     preco: 33.00 },
          { label: 'Lombo de Porco',     preco: 33.00 },
        ]
      },
      {
        id: 12, nome: 'Cheese Egg Bacon Burger',
        descricao: 'Pão, bife, mussarela, ovo, bacon, salada e batata palha',
        imagem: BASE + 'SKU012_CHEESE_EGG_BACON_BURGUER.jpg',
        proteinas: [
          { label: 'Bife de Hamburguer', preco: 25.00 },
          { label: 'Filé de Frango',     preco: 33.00 },
          { label: 'Lombo de Porco',     preco: 33.00 },
        ]
      },
    ]
  },

  // ── HAMBÚRGUERES DUPLOS ──────────────────────────────────────
  {
    id: 'duplos',
    nome: '🍔 Hambúrgueres Duplos',
    emoji: '🍔',
    itens: [
      { id: 101, nome: 'Hamburger Duplo',                    descricao: 'Pão, 2 bifes, salada e batata palha',                                   imagem: BASE + 'SKU013_HAMBURGER_DUPLO.jpg',                    preco: 18.00 },
      { id: 102, nome: 'Cheese Burger Duplo',                descricao: 'Pão, 2 bifes, mussarela, salada e batata palha',                        imagem: BASE + 'SKU014_CHEESE_BURGUER_DUPLO.jpg',               preco: 23.00 },
      { id: 103, nome: 'Bacon Burger Duplo',                 descricao: 'Pão, 2 bifes, bacon, salada e batata palha',                            imagem: BASE + 'SKU015_BACON_BURGER_DUPLO.jpg',                 preco: 23.00 },
      { id: 104, nome: 'Egg Burger Duplo',                   descricao: 'Pão, 2 bifes, ovo, salada e batata palha',                              imagem: BASE + 'SKU016_EGG_BURGUER_DUPLO.jpg',                  preco: 23.00 },
      { id: 105, nome: 'Calabresa Burger Duplo',             descricao: 'Pão, 2 bifes, calabresa, salada e batata palha',                        imagem: BASE + 'SKU017_CALABRESA_BURGUER_DUPLO.jpg',            preco: 23.00 },
      { id: 106, nome: 'Cheese Egg Burger Duplo',            descricao: 'Pão, 2 bifes, mussarela, ovo, salada e batata palha',                   imagem: BASE + 'SKU018_CHEESE_EGG_BURGUER_DUPLO.jpg',           preco: 26.00 },
      { id: 107, nome: 'Cheese Bacon Burger Duplo',          descricao: 'Pão, 2 bifes, mussarela, bacon, salada e batata palha',                 imagem: BASE + 'SKU019_CHEESE_BACON_BURGUER_DUPLO.jpg',         preco: 26.00 },
      { id: 108, nome: 'Egg Bacon Burger Duplo',             descricao: 'Pão, 2 bifes, ovo, bacon, salada e batata palha',                       imagem: BASE + 'SKU020_EGG_BACON_BURGUER_DUPLO.jpg',            preco: 26.00 },
      { id: 109, nome: 'Cheese Calabresa Burger Duplo',      descricao: 'Pão, 2 bifes, mussarela, calabresa, salada e batata palha',             imagem: BASE + 'SKU021_CHEESE_CALABRESA_BURGUER_DUPLO.jpg',     preco: 26.00 },
      { id: 110, nome: 'Egg Calabresa Burger Duplo',         descricao: 'Pão, 2 bifes, ovo, calabresa, salada e batata palha',                   imagem: BASE + 'SKU022_EGG_CALABRESA_BURGUER_DUPLO.jpg',        preco: 26.00 },
      { id: 111, nome: 'Cheese Egg Calabresa Burger Duplo',  descricao: 'Pão, 2 bifes, ovo, mussarela, calabresa, salada e batata palha',        imagem: BASE + 'SKU023_CHEESE_EGG_CALABRESA_BURGUER_DUPLO.jpg', preco: 30.00 },
      { id: 112, nome: 'Cheese Egg Bacon Burger Duplo',      descricao: 'Pão, 2 bifes, mussarela, ovo, bacon, salada e batata palha',            imagem: BASE + 'SKU024_CHEESE_EGG_BACON_BURGUER_DUPLO.jpg',     preco: 30.00 },
    ]
  },

  // ── ARTESANAIS ───────────────────────────────────────────────
  {
    id: 'artesanais',
    nome: '🥩 Artesanais',
    emoji: '🥩',
    itens: [
      { id: 201, nome: 'Simples Artesanal',      descricao: 'Pão, bife 160g, alface, tomate e cebola',                            imagem: BASE + 'SKU025_SIMPLES_ARTESANAL.jpg',      preco: 23.00 },
      { id: 202, nome: 'Bacon Burger Artesanal', descricao: 'Pão, bife 160g, bacon, alface, tomate e cebola',                     imagem: BASE + 'SKU026_BACON_BURGER_ARTESANAL.jpg', preco: 26.00 },
      { id: 203, nome: 'X Burger Artesanal',     descricao: 'Pão, bife 160g, queijo, alface, tomate e cebola',                    imagem: BASE + 'SKU027_X_BURGUER_ARTESANAL.jpg',    preco: 26.00 },
      { id: 204, nome: 'Egg Burger Artesanal',   descricao: 'Pão, bife 160g, ovo, alface, tomate e cebola',                       imagem: BASE + 'SKU028_EGG_BURGUER_ARTESANAL.jpg',  preco: 26.00 },
      { id: 205, nome: 'X Bacon Artesanal',      descricao: 'Pão, bife 160g, bacon, queijo, alface, tomate e cebola',             imagem: BASE + 'SKU029_X_BACON_ARTESANAL.jpg',      preco: 30.00 },
      { id: 206, nome: 'X Egg Bacon Artesanal',  descricao: 'Pão, bife 160g, queijo, ovo, bacon, alface, tomate e cebola',        imagem: BASE + 'SKU030_X_EGG_BACON_ARTESANAL.jpg',  preco: 34.00 },
      { id: 207, nome: 'Artesanal X Egg Duplo',  descricao: 'Pão, 2 bifes 160g, 2 ovos, queijo, alface, tomate e cebola',         imagem: BASE + 'SKU031_ARTESANAL_X_EGG_DUPLO.jpg',  preco: 41.00 },
    ]
  },

  // ── LANCHES DA CASA ──────────────────────────────────────────
  {
    id: 'casaespecial',
    nome: '⭐ Lanches da Casa',
    emoji: '⭐',
    itens: [
      { id: 401, nome: 'Laçador',    descricao: 'Pão, bife, salada, frango desfiado, ovo, mussarela, presunto e batata palha',                        imagem: BASE + 'SKU032_LACADOR.jpg',    preco: 32.00 },
      { id: 402, nome: 'Especial',   descricao: 'Pão, bife, salada, milho, frango desfiado, bacon, mussarela, presunto e batata palha',               imagem: BASE + 'SKU033_ESPECIAL.jpg',   preco: 34.00 },
      { id: 403, nome: 'Cheese Tudo',descricao: 'Pão, 2 bifes, salada, milho, frango desfiado, ovo, bacon, mussarela, presunto e batata palha',       imagem: BASE + 'SKU034_CHEESE_TUDO.jpg',preco: 38.00 },
    ]
  },

  // ── PÃO COM LINGUIÇA ─────────────────────────────────────────
  {
    id: 'linguica',
    nome: '🌭 Pão com Linguiça',
    emoji: '🌭',
    itens: [
      { id: 301, nome: 'Pão com Linguiça Simples',     descricao: 'Pão, linguiça, mussarela e salada',                              imagem: BASE + 'SKU035_PAO_LINGUICA_SIMPLES.jpg',      preco: 19.00 },
      { id: 302, nome: 'Pão com Linguiça Tradicional', descricao: 'Pão, linguiça, mussarela, bacon e salada',                       imagem: BASE + 'SKU036_PAO_LINGUICA_TRADICIONAL.jpg',  preco: 24.00 },
      { id: 303, nome: 'Pão com Linguiça da Casa',     descricao: 'Pão, linguiça, mussarela, bacon, ovo, catupiry e salada',        imagem: BASE + 'SKU037_PAO_LINGUICA_DA_CASA.jpg',      preco: 29.00 },
    ]
  },

  // ── MACARRÃO NA CHAPA ────────────────────────────────────────
  {
    id: 'macarrao',
    nome: '🍝 Macarrão na Chapa',
    emoji: '🍝',
    itens: [
      {
        id: 501, nome: 'Macarrão Alho, Óleo e Bacon',
        descricao: 'Macarrão, alho, óleo, bacon, azeite, mussarela, milho e cheiro verde',
        imagem: BASE + 'SKU038_MACARRAO_ALHO_OLEO_BACON.jpg',
        tamanhos: [{ label: 'Meio', preco: 23.00 }, { label: 'Inteiro', preco: 33.00 }]
      },
      {
        id: 502, nome: 'Macarrão à Bolonhesa',
        descricao: 'Macarrão, molho de carne moída, mussarela, milho e cheiro verde',
        imagem: BASE + 'SKU039_MACARRAO_BOLONHESA.jpg',
        tamanhos: [{ label: 'Meio', preco: 23.00 }, { label: 'Inteiro', preco: 33.00 }]
      },
      {
        id: 503, nome: 'Macarrão à Bolonhesa Big',
        descricao: 'Macarrão, molho de carne moída, bacon, calabresa, catupiry, mussarela, milho e cheiro verde',
        imagem: BASE + 'SKU040_MACARRAO_BOLONHESA_BIG.jpg',
        tamanhos: [{ label: 'Meio', preco: 28.00 }, { label: 'Inteiro', preco: 39.00 }]
      },
      {
        id: 504, nome: 'Macarrão de Frango',
        descricao: 'Macarrão, molho de frango, mussarela, milho e cheiro verde',
        imagem: BASE + 'SKU041_MACARRAO_FRANGO.jpg',
        tamanhos: [{ label: 'Meio', preco: 22.00 }, { label: 'Inteiro', preco: 32.00 }]
      },
      {
        id: 505, nome: 'Macarrão de Frango Big',
        descricao: 'Macarrão, molho de frango, bacon, calabresa, catupiry, mussarela, milho e cheiro verde',
        imagem: BASE + 'SKU042_MACARRAO_FRANGO_BIG.jpg',
        tamanhos: [{ label: 'Meio', preco: 28.00 }, { label: 'Inteiro', preco: 39.00 }]
      },
    ]
  },

  // ── PORÇÕES ──────────────────────────────────────────────────
  {
    id: 'porcoes',
    nome: '🍟 Porções',
    emoji: '🍟',
    itens: [
      { id: 601, nome: 'Batata (200g) Queijo e Bacon',      descricao: 'Porção de batata frita 200g com queijo e bacon',                         imagem: BASE + 'SKU043_BATATA_200G_QUEIJO_BACON.jpg',      preco: 22.00 },
      { id: 602, nome: 'Batata (400g) Queijo e Bacon',      descricao: 'Porção de batata frita 400g com queijo e bacon',                         imagem: BASE + 'SKU044_BATATA_400G_QUEIJO_BACON.jpg',      preco: 34.00 },
      { id: 603, nome: 'Porção de Contra Filé Inteira',     descricao: '500g de batata frita, 400g de contra filé, queijo e bacon',              imagem: BASE + 'SKU045_PORCAO_CONTRA_FILE_INTEIRA.jpg',    preco: 90.00 },
      { id: 604, nome: 'Meia Porção de Contra Filé',        descricao: '300g de batata frita, 200g de contra filé, queijo e bacon',              imagem: BASE + 'SKU046_MEIA_PORCAO_CONTRA_FILE.jpg',       preco: 70.00 },
      { id: 605, nome: 'Porção de Pernil Inteira',          descricao: '500g de batata frita, 400g de pernil, queijo e bacon',                   imagem: BASE + 'SKU047_PORCAO_PERNIL_INTEIRA.jpg',         preco: 80.00 },
      { id: 606, nome: 'Meia Porção de Pernil',             descricao: '300g de batata frita, 200g de pernil, queijo e bacon',                   imagem: BASE + 'SKU048_MEIA_PORCAO_PERNIL.jpg',            preco: 60.00 },
    ]
  },

  // ── BEBIDAS ──────────────────────────────────────────────────
  {
    id: 'bebidas',
    nome: '🥤 Bebidas',
    emoji: '🥤',
    itens: [
      { id: 701, nome: 'Coca-Cola 2L',         descricao: 'Refrigerante Coca-Cola 2 litros',         imagem: BASE + 'SKU049_COCA_COLA_2L.jpg',          preco: 16.00 },
      { id: 702, nome: 'Fanta Laranja 2L',     descricao: 'Refrigerante Fanta Laranja 2 litros',     imagem: BASE + 'SKU050_FANTA_LARANJA_2L.jpg',      preco: 16.00 },
      { id: 703, nome: 'Guaraná 1L',           descricao: 'Refrigerante Guaraná 1 litro',            imagem: BASE + 'SKU051_GUARANA_1L.jpg',            preco: 12.00 },
      { id: 704, nome: 'Coca-Cola 1L',         descricao: 'Refrigerante Coca-Cola 1 litro',          imagem: BASE + 'SKU052_COCA_COLA_1L.jpg',          preco: 12.00 },
      { id: 705, nome: 'Coca-Cola 600ml',      descricao: 'Refrigerante Coca-Cola 600ml',            imagem: BASE + 'SKU053_COCA_COLA_600ML.jpg',       preco:  9.00 },
      { id: 706, nome: 'Coca-Cola Lata',       descricao: 'Refrigerante Coca-Cola lata 350ml',       imagem: BASE + 'SKU054_COCA_COLA_LATA.jpg',        preco:  6.50 },
      { id: 707, nome: 'Fanta Laranja Lata',   descricao: 'Refrigerante Fanta Laranja lata 350ml',   imagem: BASE + 'SKU055_FANTA_LARANJA_LATA.jpg',    preco:  6.50 },
      { id: 708, nome: 'Monster Energético',   descricao: 'Energético Monster 473ml',                imagem: BASE + 'SKU056_MONSTER_ENERGETICO.jpg',    preco: 12.00 },
      { id: 709, nome: 'Brahma Latão',         descricao: 'Cerveja Brahma latão 473ml',              imagem: BASE + 'SKU057_BRAHMA_LATAO.jpg',          preco:  8.00 },
      { id: 710, nome: 'Skol Latão',           descricao: 'Cerveja Skol latão 473ml',                imagem: BASE + 'SKU058_SKOL_LATAO.jpg',            preco:  8.00 },
      { id: 711, nome: 'Suco Tial Uva 1L',     descricao: 'Suco Tial sabor Uva 1 litro',            imagem: BASE + 'SKU059_SUCO_TIAL_UVA_1L.jpg',      preco: 13.00 },
      { id: 712, nome: 'Suco Tial Uva Lata',   descricao: 'Suco Tial sabor Uva lata',               imagem: BASE + 'SKU060_SUCO_TIAL_UVA_LATA.jpg',    preco:  6.00 },
      { id: 713, nome: 'Del Valle Uva 1L',     descricao: 'Suco Del Valle sabor Uva 1 litro',        imagem: BASE + 'SKU061_DEL_VALLE_UVA_1L.jpg',      preco: 13.00 },
      { id: 714, nome: 'Del Valle Laranja 1L', descricao: 'Suco Del Valle sabor Laranja 1 litro',    imagem: BASE + 'SKU062_DEL_VALLE_LARANJA_1L.jpg',  preco: 13.00 },
      { id: 715, nome: 'Del Valle Uva Lata',   descricao: 'Suco Del Valle sabor Uva lata',           imagem: BASE + 'SKU063_DEL_VALLE_UVA_LATA.jpg',    preco:  6.00 },
      { id: 716, nome: 'Água s/ Gás',          descricao: 'Água mineral sem gás',                    imagem: BASE + 'SKU064_AGUA_SEM_GAS.jpg',          preco:  3.50 },
      { id: 717, nome: 'Água c/ Gás',          descricao: 'Água mineral com gás',                    imagem: BASE + 'SKU065_AGUA_COM_GAS.jpg',          preco:  4.00 },
    ]
  },
]
