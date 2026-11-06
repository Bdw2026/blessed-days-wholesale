/* Catalogue seed: every product and size listed on cliganic.com on 6 Nov 2026, with the brand's own SKUs.
   Line format: title ^ category ^ size~sku~US retail~available on brand site ; ...
   Used once, to fill an empty products table. After that the database is the source of truth. */
const BEST = ['CL-BE-001-4', 'CL-BE-028-4', 'CL-BE-030-1', 'CL-BE-057-1', 'CL-BE-067', 'CL-BE-032-10ml', 'CL-BE-050-10ml', 'CL-GA-001-10PK', 'CL-GA-003-10'];
const RAW = `Multi-Use Tweezer Set - Assorted Colors^AC^~CL-BE-011-NB~9.99~0
Slant Tip Tweezer^AC^Pink / 2-pack~CL-BE-008-PK-2PK-NB~8.99~0;Pink / 4-pack~CL-BE-008-PK-4PK-NB~15.99~0;Black / 2-pack~CL-BE-008-BK-2PK-NB~8.99~0;Black / 4-pack~CL-BE-008-BK-4PK-NB~15.99~0;Blue / 2-pack~CL-BE-008-BU-2PK-NB~8.99~0;Blue / 4-pack~CL-BE-008-BU-4PK-NB~15.99~0
Slant & Point Tweezers^AC^~CL-BE-044-NB~7.99~0
Nail Files^AC^12-pack~CL-BE-016-BK-12PK~6.99~0;20-pack~CL-BE-016-BK-20PK~9.99~0
Jojoba & Castor Oil The Dynamic Duo^SH^~CL-BE-BUNDLE29~35.98~1
The Lip Balm Advent Calendar^LB^~CL-BE-209-NB~24.99~1
Organic Black Castor Oil^SH^~CL-BE-195-4-NB~11.99~0
Organic Lemon Eucalyptus Essential Oil^EO^~CL-BE-160-10ml-NB~11.99~1
Aluminum-Free Deodorants (3-Pack)^SK^~CL-BE-BUNDLE28~35.97~1
Organic Rosemary Oil with Pipette Dropper, 1oz^EO^~CL-BE-040-1-DROP-NB~15.99~1
The Grow Your Glow Duo^SH^~CL-BE-BUNDLE26~30.98~1
The Balance Duo^SK^~CL-BE-BUNDLE25~28.98~1
The Glow Duo^SK^~CL-BE-BUNDLE24~27.98~1
The Radiance Duo^SK^~CL-BE-BUNDLE23~24.98~1
Mosquito Repellent Spray^MR^~A2Z-FG-CL-GA-013-4-NB~11.99~1
Vetiver Jasmine Deodorant (Aluminum-Free)^SK^~CL-BE-199-NB~11.99~1
Vanilla Orchid Deodorant (Aluminum-Free)^SK^~CL-BE-198-NB~11.99~1
Cypress Neroli Deodorant (Aluminum-Free)^SK^~CL-BE-188-NB~11.99~1
The 3-Step Face Routine^SK^~CL-BE-BUNDLE22~40.97~1
Hydrating Bar Soap Set - Vetiver Jasmine & Vanilla Orchid (2 Pack)^SK^~CL-BE-BUNDLE16~11.98~1
Hydrating Bar Soap (2 Pack) - Vanilla Orchid^SK^~CL-BE-BUNDLE33~11.98~1
Hydrating Bar Soap (2 Pack) - Vetiver Jasmine^SK^~CL-BE-BUNDLE32~11.98~1
Exfoliating Scrub Bar Soap (2 Pack) - Violet Wood^SK^~CL-BE-BUNDLE31~11.98~1
Exfoliating Scrub Bar Soap (2 Pack) - Cypress Neroli^SK^~CL-BE-BUNDLE30~11.98~1
Mosquito Repellent Pellet Refills^MR^6 Refills~CL-GA-011-REFILL-6PK~11.49~1
Mane Character Energy^SH^~CL-BE-BUNDLE21~66.46~0
Essential Oil Core Collection - 10ml^ES^~CL-BE-BUNDLE19~59.94~1
Essential Oil Beginners Kit (10ml)^ES^~CL-BE-BUNDLE20~27.97~1
Organic Omega Glow Face Serum^SK^~CL-BE-178-1-NB~11.99~1
Organic Laurel Essential Oil^EO^~CL-BE-152-10ml-NB~11.99~1
Exfoliating Scrub Bar Soap Duo - Violet Wood & Cypress Neroli^SK^~CL-BE-BUNDLE17~11.98~1
Mosquito Bracelets Bundle - (3 Colors of 10-Pack)^MR^~CL-BE-BUNDLE15~38.97~1
Extra Large Face Pads^CT^2 Pack, 100 Count~CL-BE-202-50-2PK~10.99~1
Organic Castor Oil Lash & Brow Wand^SH^~CL-BE-183-NB~11.99~1
Organic Black Spruce Essential Oil^EO^~CL-BE-194-10ml-NB~11.99~1
Mosquito Repellent Stick^MR^1-Pack~CL-GA-012~9.99~1;2-Pack~CL-GA-012-2pck~19.98~1;3-Pack~CL-GA-012-3pck~29.97~1
Insulated Tumbler Cup 40 oz^AC^~CL-BE-MERCH-CUP~30.00~1
Mosquito Repellent Patches - Animal^MR^1 Pack, 90 Count~CL-GA-006-90~19.99~1;1 Pack, 180 Count~CL-GA-006-180~29.98~1;3 Packs, 270 Count~CL-GA-006-90-3PCK~44.97~1;6 Packs, 540 Count~CL-GA-006-90-6PCK~89.94~1;10 Packs, 900 Count~CL-GA-006-90-10PCK~119.90~1
Mosquito Repellent Bracelets - Classic Colors^MR^1 Pack, 10 Count~CL-GA-001-10PK~12.99~1;1 Pack, 25 Count~CL-GA-001-25PK~29.99~1;1 Pack, 40 Count~CL-GA-001-40PK~51.96~1;1 Pack, 100 Count~CL-GA-001-100PK~59.99~1
Organic Lip Balm Set - Rainforest Fresh^LB^~CL-BE-053~11.99~1
Organic Lip Balm Set - Fresh Faves^LB^~CL-BE-163~4.99~1
Organic Single Lip Balm - Vanilla^LB^~CL-BE-084~2.99~1
Apple Cider Vinegar Gummies^SU^30 Day Supply, 60 Count~CL-SUP-005-60~11.99~1;60 Day Supply, 120 Count~CL-SUP-005-120~19.99~1
Biotin Gummies^SU^30 Day Supply, 30 Count~CL-SUP-004-30~10.99~1;60 Day Supply, 60 Count~CL-SUP-004-60~18.99~0
Probiotic Gummies^SU^60 Count~CL-SUP-001-60~16.99~0;120 Count~CL-SUP-001-120~33.98~0;180 Count~CL-SUP-001-60-3PCK~50.97~0
Sugar-Free Probiotic Gummies^SU^30 Count~CL-SUP-002-30~12.99~0;60 Count~CL-SUP-002-60~19.99~0;120 Count~CL-SUP-002-60-2PCK~29.99~0;180 Count~CL-SUP-002-60-3PCK~41.99~0
Rosemary Repair Scalp & Strand Oil^SH^2 oz~CL-BE-187-2-NB~11.99~1;4 oz~CL-BE-187-4-NB~19.99~1
Hydrating Bar Soap - Vetiver Jasmine^SK^Single~CL-BE-192-NB~5.99~1;2-Pack~CL-BE-BUNDLE32~11.98~1
Hydrating Bar Soap - Vanilla Orchid^SK^Single~CL-BE-193-NB~5.99~1;2-Pack~CL-BE-BUNDLE33~11.98~1
Exfoliating Scrub Bar Soap - Cypress Neroli^SK^Single~CL-BE-190-NB~5.99~1;2-Pack~CL-BE-BUNDLE30~11.98~1
Exfoliating Scrub Bar Soap - Violet Wood^SK^Single~CL-BE-191-NB~5.99~1;2-Pack~CL-BE-BUNDLE31~11.98~0
Melatonin Gummies^SU^60 Count~CL-SUP-003-60~15.99~0;120 Count~CL-SUP-003-120~31.98~1;180 Count~CL-SUP-003-60-3PCK~47.97~0
Mosquito Repellent Bracelets - Neutral Colors^MR^10 Pack~CL-GA-025-10PK~12.99~1;40 Pack~CL-GA-025-40PK~32.99~1
Mosquito Repellent Bracelets - Rainbow Colors^MR^~CL-GA-026-10PK~12.99~1
Bare Necessities Makeup Removal Bundle^SK^~CL-BE-BUNDLE14~64.97~1
Barrier Boost Face Moisturizer^SK^~CL-BE-180-NB~12.99~1
Organic Pine Essential Oil^EO^~CL-BE-135-10~9.99~1
Organic Clary Sage Essential Oil^EO^~CL-BE-131-10m~11.99~1
Organic Lime Essential Oil^EO^~CL-BE-086-10ml~11.99~1
Organic Hemp Seed Oil^SH^~CL-BE-158-8~16.99~1
Mosquito Repellent Candle (Large 22 oz)^MR^1 Pack~CL-GA-010-22~30.99~1;2 Pack~CL-GA-010-22-2PK~43.99~0
Aromatherapy Serenity Starter Kit^DF^~A2Z-FG-CL-BE-175-NB-V2~99.99~1
Aromatherapy Signature Starter Kit^DF^~CL-BE-176-NB~99.99~1
Nature’s Glow Deluxe Trio^SH^~CL-BE-BUNDLE13~58.97~0
Fresh Balance Face Cleanser^SK^~CL-BE-179-8-NB~15.99~1
5-Piece Essential Oil Aromatherapy Set^ES^5 ml~CL-BE-071-NB~14.99~1;15 ml~CL-BE-071-15ml~28.99~1
4-Piece Essential Oil Aromatherapy Set^ES^5 ml~CL-BE-052~14.99~1
Stick & Go Mosquito Repellent Patches Bundle^MR^~CL-BE-BUNDLE11~43.97~1
Clean Face Towels^CT^1 Pack, 50 Count~CL-BE-182-50~14.99~1;2 Packs, 100 Count~CL-BE-182-50-2PK~29.99~0;4 Packs, 200 Count~CL-BE-182-50-4PK~59.99~0
Out & About Mosquito Repellent Bundle^MR^50 Count~CL-GA-018~23.99~1;100 Count~CL-GA-024~36.99~1
Moments for Mom^SK^~CL-BE-BUNDLE10~59.95~0
Eco-Reset Bundle^AC^~CL-BE-BUNDLE9~60.95~1
Essential Oil Diffuser^DF^White~CL-BE-129-WH-NB~79.99~1;Sage~CL-BE-129-SA-NB~79.99~1;Black~CL-BE-129-BL-NB~79.99~1
Organic Cotton Swabs - Paper^CT^400 Count~CL-BE-157-400~7.99~1;500 Count~CL-BE-021-UPC~8.99~1
Organic Jumbo Cotton Balls^CT^~CL-BE-123~6.99~1
Organic Cotton Swabs - Bamboo^CT^100 Count~CL-BE-170-100~2.99~1;200 Count~CL-BE-155-200~3.99~1;400 Count~CL-BE-155-400~7.99~1
Age-Defying Essentials Duo^SH^~CL-BE-BUNDLE8~31.98~0
Nourish & Protect Oil Trio^SH^~CL-BE-BUNDLE7~41.97~0
Radiant Skin Bundle^SH^~CL-BE-BUNDLE5~56.96~0
Timeless Beauty Bundle^SH^~CL-BE-BUNDLE6~43.97~0
Non-GMO Jojoba Oil Bulk 128 oz^SH^128 oz~CL-BE-048-128~129.99~1
Organic Argan Oil Bulk 128 oz^SH^128 oz~CL-BE-030-128~239.99~0
Organic Jojoba Oil Bulk^SH^128 oz~CL-BE-001-128~179.99~1;32 oz~CL-BE-001-32-JUG~45.99~1
Organic Super Jumbo Cotton Balls^CT^100 Count~CL-BE-022~7.99~1;200 Count~CL-BE-055~11.99~0
Mosquito Repellent Candle (9oz)^MR^1 Pack~CL-GA-010-9~11.49~1;2 Pack~CL-GA-010-9-2PK~19.90~0
Mosquito Repellent Candles (4oz, Pack of 2)^MR^2 Pack~CL-GA-010-4-2PK~14.49~1
Jojoba, Argan & Castor Oil Starter Kit Trio^SH^~TT-BUNDLE6~52.97~0
Mosquito Repellent Refillable Clip & Pellets^MR^1PK & 2 Refills~CL-GA-017-1PK~11.49~1;2PK & 4 Refills~CL-GA-017-2PK~16.99~0
Mosquito Repellent Refillable Wristband & Pellets^MR^1PK & 2 Refills~CL-GA-011-1PK~11.49~1;2PK & 4 Refills~CL-GA-011-2PK~15.99~1;3PK & 6 Refills~CL-GA-011-3PK~22.99~1;4PK & 8 Refills~CL-GA-011-4PK~29.99~1
Organic Lip Balm Set - Orange Shake^LB^~CL-BE-162~4.99~1
Organic Lip Balm Set - Sweet Mint^LB^~CL-BE-161~4.99~1
Organic Lip Balm Set - Cooling Citrus^LB^~CL-BE-143~4.99~1
Organic Lip Balm Set - Tropical Twist^LB^~CL-BE-142~4.99~1
Organic Pomegranate Oil^SH^~CL-BE-127-1~11.49~0
Organic Lip Balm Set - Fresh Picked^LB^~CL-BE-145~15.49~1
Organic Lip Balm Set - Sweet Bliss^LB^~CL-BE-144~9.49~1
Super Jumbo Cotton Balls^CT^~CL-BE-023~9.99~1
Organic Lip Balm - Citrus^LB^~CL-BE-083~2.99~1
Organic Lip Balm - Unscented^LB^~CL-BE-080~2.99~1
Organic Lip Balm - Coconut^LB^~CL-BE-079~2.99~1
Organic Lip Balm - Eucalyptus Mint^LB^~CL-BE-078~2.99~0
Mosquito Repellent Patches - Adventure^MR^90 Count~CL-GA-007-90~11.99~1;180 Count~CL-GA-007-180~19.99~1;270 Count~CL-GA-007-90-3PCK~27.99~1
Mosquito Repellent Patches - Positive Vibes^MR^1 Pack, 90 Count~CL-GA-005-90~11.99~1;2 Packs, 180 Count~CL-GA-005-90-2PCK~23.98~1;3 Packs, 270 Count~CL-GA-005-90-3PCK~35.97~1
Mosquito Repellent Patches - Solid^MR^1 Pack, 90 Count~CL-GA-002-90~11.99~1;180 Count~CL-GA-002-180~19.99~1;360 Count~CL-GA-002-360~31.99~1
Organic May Chang Essential Oil^EO^~CL-BE-125-10ml~10.99~1
Organic Grapeseed Oil^SH^~CL-BE-124-8~14.99~0
Organic Carrot Seed Essential Oil^EO^10 ml~CL-BE-128-10ml~10.99~1
Organic Sunflower Seed Oil^SH^~CL-BE-136-8~11.99~1
Organic Apricot Kernel Oil^SH^8 oz~CL-BE-132-8~16.99~1;16 oz~CL-BE-132-16~28.99~1
Non-GMO Squalane Oil^SH^1 oz~CL-BE-126-1~12.99~1;2 oz~CL-BE-126-2~18.99~1
Organic Evening Primrose Oil^SH^~CL-BE-134-1~11.99~0
Organic Borage Oil^SH^~CL-BE-133-1~11.99~0
Organic Oregano Essential Oil^EO^~CL-BE-091-10ml~9.99~1
Essential Oil Ceramic Diffuser^DF^Black~CL-BE-120-BK~69.99~1;White~CL-BE-120-WH~69.99~1
Organic Sea Buckthorn Oil^SH^~CL-BE-029-1-NB~17.99~0
Organic Sweet Almond Oil^SH^~CL-BE-099-8~14.99~1
Organic Vitamin E Oil^SH^1 oz~CL-BE-116-1~14.99~0;2 oz~CL-BE-116-2~24.99~1
Organic Avocado Oil^SH^8 oz~CL-BE-070-8~13.99~1
Microfiber Mosquito Repellent Bracelets^MR^10 Pack~CL-GA-003-10~11.99~1;20 Pack~CL-GA-003-20~19.99~1;30 Pack~CL-GA-003-10-3PCK~27.99~1
Organic Rose Geranium Essential Oil^EO^~CL-BE-121-10ml~13.99~0
Organic Lemon Tea Tree Essential Oil^EO^~CL-BE-122-10ml~9.99~0
Bundle & Save! Top 6 Essential Oils Set with Diffuser^ES^~CL-BE-BUNDLE3~61.98~1
Organic Sleep Surrender Essential Oil Blend^EB^~CL-BE-089-10ml~11.99~1
Organic Pep Rally Essential Oil Blend^EB^~CL-BE-101-10ml~11.99~0
Organic Soothe Fest Essential Oil Blend^EB^~CL-BE-100-10ml~12.99~0
In The Wild Essential Oil Blend^EB^~CL-BE-102-10ml~11.99~0
Organic Happily Grounded Essential Oil Blend^EB^~CL-BE-103-10ml~13.99~1
Organic Fresh Air Essential Oil Blend^EB^~CL-BE-104-10ml~12.99~1
Organic Comfort & Joy Essential Oil Blend^EB^~CL-BE-090-10ml~11.99~0
Organic Deep Breaths Essential Oil Blend^EB^~CL-BE-088-10ml~11.99~1
Organic Well Being Essential Oil Blend^EB^~CL-BE-087-10ml~11.99~1
Organic Pumpkin Seed Oil^SH^4 oz~CL-BE-119-4~11.99~0;8 oz~CL-BE-119-8~18.99~0;16 oz~CL-BE-119-16~31.99~1
Organic Cardamom Essential Oil^EO^~CL-BE-110-10ml~19.99~0
Organic Citronella Essential Oil^EO^10 ml~CL-BE-112-10ml~8.99~0;1 oz~CL-BE-112-1~15.99~0
Organic Neem Oil^SH^~CL-BE-097-4~11.99~0
Organic Turmeric Essential Oil^EO^~CL-BE-113-10ml~10.99~0
Organic Clove Bud Essential Oil^EO^~CL-BE-107-10ml~9.99~0
Organic Cinnamon Leaf Essential Oil^EO^~CL-BE-109-10ml~9.99~1
Organic Moringa Oil^SH^1 oz~CL-BE-111-1~12.99~1;2 oz~CL-BE-111-2~19.99~1
Organic Patchouli Essential Oil^EO^10 ml~CL-BE-108-10ml~9.99~1;1 oz~CL-BE-108-1~15.99~1
Organic Black Pepper Essential Oil^EO^10 ml~CL-BE-095-10ml-NB~9.99~1
Organic Atlas Cedarwood Essential Oil^EO^10 ml~CL-BE-066-10ml~9.49~1;1 oz~CL-BE-066-1~12.49~1;2 oz~CL-BE-066-2~16.99~0
Bundle & Save! Top 12 Essential Oils Set with Diffuser^ES^~CL-BE-BUNDLE2~82.98~1
Jojoba, Argan & Rosehip Oil Nature’s Glow Trio^SH^~CL-BE-BUNDLE1~36.97~0
Organic Baobab Oil^SH^1 oz~CL-BE-106-1~11.99~1;2 oz~CL-BE-106-2~17.99~1
Organic Marula Oil^SH^1 oz~CL-BE-098-1~12.99~1;2 oz~CL-BE-098-2~19.99~1
Tinted Lip Balm Set - Hint of Tint^LB^~CL-BE-082~11.99~1
Organic Star Anise Essential Oil^EO^~CL-BE-096-10ml~9.99~1
Organic Coriander Essential Oil^EO^~CL-BE-094-10ml~9.99~1
Organic Geranium Essential Oil^EO^10 ml~CL-BE-093-10ml~12.99~1;1 oz~CL-BE-093-1~21.99~1
Organic Basil Essential Oil^EO^~CL-BE-092-10ml~9.99~1
Organic Lip Balm Set - Tropical Passion^LB^~CL-BE-072~11.99~1
Organic Ylang Ylang Essential Oil^EO^10 ml~CL-BE-035-10ml~11.99~1;1 oz~CL-BE-035-1~23.49~1
100% Pure Vitamin E Oil^SH^1 oz~CL-BE-067~12.99~1;2 oz~CL-BE-067-2~19.99~1;4 oz~CL-BE-067-4~35.99~1;8 oz~CL-BE-067-8~64.99~1
Non-GMO Jojoba Oil^SH^2 oz~CL-BE-048-2~7.99~1;4 oz~CL-BE-048-4~11.99~1;8 oz~CL-BE-048-8~16.99~1;16 oz~CL-BE-048-16~25.99~1;32 oz~CL-BE-048-32-PUMP~41.99~1
Organic Tamanu Oil^SH^2 oz~CL-BE-036-2~11.99~1;4 oz~CL-BE-036-4~18.99~1
Organic Bergamot Essential Oil^EO^10 ml~CL-BE-059-10ml~12.99~1;1 oz~CL-BE-059-1~32.99~0
Organic Pink Grapefruit Essential Oil^EO^10 ml~CL-BE-060-10ml~11.99~1;1 oz~CL-BE-060-1~24.99~1
Organic Sweet Orange Essential Oil^EO^10 ml~CL-BE-039-10ml~7.99~1;1 oz~CL-BE-039-1~9.99~1;4 oz~CL-BE-039-4~15.99~1
Organic Tea Tree Essential Oil^EO^10 ml~CL-BE-037-10ml~8.99~1;1 oz~CL-BE-037-1~12.99~1;2 oz~CL-BE-037-2~18.99~1
Organic Cotton Rounds^CT^100 Count~CL-BE-020-100~3.49~1;300 Count~CL-BE-020-100-3PK-UPC~10.47~0;500 Count~CL-BE-020-100-5PK~17.99~0
Wooden Ultrasonic Aromatherapy Diffuser^DF^~CL-BE-043~42.99~1
12-Piece Essential Oil Aromatherapy Set^ES^5 ml~CL-BE-046~40.99~1
6-Piece Essential Oil Aromatherapy Set^ES^5 ml~CL-BE-045~18.99~1
Organic Castor Oil^SH^1 oz~CL-BE-057-1~8.99~1;2 oz~CL-BE-057-2~9.99~1;4 oz~CL-BE-057-4~11.99~1;8 oz~CL-BE-057-8~14.99~1;16 oz~CL-BE-057-16~22.99~1
Premium Cotton Rounds^CT^100 Count~CL-BE-019-100~2.99~1;200 Count~CL-BE-019-100-2PK~5.70~0;300 Count~CL-BE-019-100-3PK~8.97~1;600 Count~CL-BE-019-100-6PK~16.99~1;1200 Count~CL-BE-019-100-12PK~29.48~0
Organic Argan Oil^SH^1 oz~CL-BE-030-1~10.49~1;2 oz~CL-BE-030-2~11.99~1;4 oz~CL-BE-030-4~16.99~0;8 oz~CL-BE-030-8~25.99~1;16 oz~CL-BE-030-16~38.90~1
Organic Lemongrass Essential Oil^EO^10 ml~CL-BE-049-10ml~8.99~1;1 oz~CL-BE-049-1~13.99~1
Organic Peppermint Essential Oil^EO^10 ml~CL-BE-050-10ml~8.99~1;1 oz~CL-BE-050-1~14.99~1;2 oz~CL-BE-050-2~22.99~1
Organic Rosemary Essential Oil^EO^10 ml~CL-BE-040-10ml~9.99~1;1 oz~CL-BE-040-1~14.99~1;2 oz~CL-BE-040-2~23.99~1
Organic Eucalyptus Essential Oil^EO^10 ml~CL-BE-018-10ml~8.99~0;1 oz~CL-BE-018-1~13.99~1;2 oz~CL-BE-018-2~22.99~1
Organic Lavender Essential Oil^EO^10 ml~CL-BE-038-10ml~9.99~1;1 oz~CL-BE-038-1~16.99~1;2 oz~CL-BE-038-2~30.99~1
8-Piece Essential Oil Aromatherapy Set^ES^5 ml~CL-BE-027~25.99~1;15 ml~CL-BE-027-15ml~52.99~1
Organic Cinnamon Cassia Essential Oil^EO^10 ml~CL-BE-031-10ml~9.99~1;1 oz~CL-BE-031-1~15.99~1
Organic Spearmint Essential Oil^EO^10 ml~CL-BE-034~9.99~0;1 oz~CL-BE-034-1~15.99~1
Organic Palmarosa Essential Oil^EO^10 ml~CL-BE-033~9.99~0;1 oz~CL-BE-033-1~15.99~0
Organic Frankincense Essential Oil^EO^10 ml~CL-BE-032-10ml~9.99~1;1 oz~CL-BE-032-1~15.99~0;2 oz~CL-BE-032-2~30.99~0
Organic Rosehip Oil^SH^1 oz~CL-BE-028-1~11.99~0;2 oz~CL-BE-028-2~17.99~0;4 oz~CL-BE-028-4~28.99~1;8 oz~CL-BE-028-8~36.99~0;16 oz~CL-BE-028-16~64.99~1
Organic Lemon Essential Oil^EO^10 ml~CL-BE-003-10ml~8.99~0
Organic Jojoba Oil^SH^2 oz~CL-BE-001-2oz~9.99~0;4 oz~CL-BE-001-4~12.99~1;8 oz~CL-BE-001-8-NB~20.99~1;16 oz~CL-BE-001-16~33.99~1;32 oz~CL-BE-001-32-PUMP~53.99~0`;
const CAT_ORDER = ['SH', 'EO', 'EB', 'ES', 'DF', 'SK', 'MR', 'SU', 'LB', 'CT', 'AC'];
/* The brand lists newest first, so the core range is at the bottom: read bottom-up. A SKU listed under two products is kept once. */
function seedCatalog(){
  const out = [], seen = new Set();
  RAW.split('\n').reverse().forEach(line => {
    const [name, cat, vars] = line.split('^');
    vars.split(';').forEach(v => {
      const [size0, sku, usd, avail] = v.split('~'); if (!sku || seen.has(sku)) return; seen.add(sku);
      const rrp = Number(usd), casePack = rrp >= 100 ? 1 : rrp >= 13 ? 6 : 12;
      out.push({sku, cat, name, size: size0 || (/10ml/i.test(sku) ? '10 ml' : ''), rrpUsd: rrp, price: 0, casePack, moq: casePack, stock: 'in', active: true, best: BEST.includes(sku), brandSiteOut: avail === '0'});
    });
  });
  out.sort((a, b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat));
  out.forEach((p, i) => { p.sort = i; });
  return out;
}
module.exports = {seedCatalog};
