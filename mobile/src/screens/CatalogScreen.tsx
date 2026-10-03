import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import {
  compareProducts,
  createWardrobeItem,
  deleteWardrobeItem,
  getProductOffers,
  getProducts,
  getWardrobe,
} from '../services/api';
import type {
  Product,
  ProductOffer,
  WardrobeItem,
} from '../types/api';

type Section = 'wardrobe' | 'catalog';
type CategoryKey = 'all' | 'rod' | 'reel' | 'lure' | 'line' | 'clothing' | 'accessory';

const CATEGORY_OPTIONS: Array<{ key: CategoryKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'all', label: 'Todos', icon: 'grid-outline' },
  { key: 'rod', label: 'Cañas', icon: 'remove-outline' },
  { key: 'reel', label: 'Carretes', icon: 'sync-outline' },
  { key: 'lure', label: 'Señuelos', icon: 'fish-outline' },
  { key: 'line', label: 'Líneas', icon: 'git-commit-outline' },
  { key: 'clothing', label: 'Ropa', icon: 'shirt-outline' },
  { key: 'accessory', label: 'Accesorios', icon: 'construct-outline' },
];

export function CatalogScreen({
  token,
  onOpenDeals,
}: {
  token: string;
  onOpenDeals: () => void;
}) {
  const [section, setSection] = useState<Section>('wardrobe');
  const [products, setProducts] = useState<Product[]>([]);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<CategoryKey>('all');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingWardrobe, setLoadingWardrobe] = useState(true);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [offersByProduct, setOffersByProduct] = useState<Record<string, ProductOffer[]>>({});
  const [offersLoadingId, setOffersLoadingId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<Product[]>([]);
  const [comparing, setComparing] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [gearName, setGearName] = useState('');
  const [gearBrand, setGearBrand] = useState('');
  const [gearModel, setGearModel] = useState('');
  const [gearDescription, setGearDescription] = useState('');
  const [gearCategory, setGearCategory] = useState<CategoryKey>('lure');
  const [savingGear, setSavingGear] = useState(false);

  async function loadWardrobe() {
    setLoadingWardrobe(true);
    try {
      setWardrobe(await getWardrobe(token));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo cargar tu equipo.');
    } finally {
      setLoadingWardrobe(false);
    }
  }

  useEffect(() => {
    void loadWardrobe();
  }, [token]);

  useEffect(() => {
    const id = setTimeout(() => {
      setLoadingProducts(true);
      getProducts(q, { limit: 60 })
        .then(setProducts)
        .catch((err) => {
          setMessage(err instanceof Error ? err.message : 'No se pudo cargar el catálogo.');
        })
        .finally(() => setLoadingProducts(false));
    }, 250);

    return () => clearTimeout(id);
  }, [q]);

  const filteredProducts = useMemo(
    () => products.filter((product) => category === 'all' || normalizeCategory(product.category) === category),
    [category, products],
  );

  const wardrobeCatalogIds = useMemo(
    () => new Set(wardrobe.map((item) => item.catalog_product_id).filter(Boolean)),
    [wardrobe],
  );

  async function addCatalogProduct(product: Product) {
    if (wardrobeCatalogIds.has(product.id)) {
      setMessage('Ese producto ya está en Mi equipo.');
      return;
    }

    setMessage('');
    try {
      const created = await createWardrobeItem(token, {
        catalog_product_id: product.id,
        category: product.category,
        brand: product.brand,
        model: product.model,
        name: product.name,
        description: product.description,
        specifications: product.specifications,
        photo_url: product.media_urls?.[0] ?? null,
        visibility: 'public',
      });
      setWardrobe((current) => [created, ...current]);
      setMessage(`${product.name} se agregó a Mi equipo.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo agregar el producto.');
    }
  }

  async function addCustomGear() {
    if (!gearName.trim()) {
      setMessage('Escribe un nombre para el equipo.');
      return;
    }

    setSavingGear(true);
    setMessage('');
    try {
      const created = await createWardrobeItem(token, {
        category: gearCategory === 'all' ? 'accessory' : gearCategory,
        brand: gearBrand.trim() || null,
        model: gearModel.trim() || null,
        name: gearName.trim(),
        description: gearDescription.trim() || null,
        specifications: {},
        photo_url: null,
        visibility: 'public',
      });
      setWardrobe((current) => [created, ...current]);
      setGearName('');
      setGearBrand('');
      setGearModel('');
      setGearDescription('');
      setGearCategory('lure');
      setShowAddForm(false);
      setMessage('Equipo agregado correctamente.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo guardar el equipo.');
    } finally {
      setSavingGear(false);
    }
  }

  async function removeGear(itemId: string) {
    if (pendingDeleteId !== itemId) {
      setPendingDeleteId(itemId);
      setMessage('Pulsa eliminar nuevamente para confirmar.');
      return;
    }

    try {
      await deleteWardrobeItem(token, itemId);
      setWardrobe((current) => current.filter((item) => item.id !== itemId));
      setPendingDeleteId(null);
      setMessage('Equipo eliminado.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo eliminar el equipo.');
    }
  }

  async function toggleProductDetails(product: Product) {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
      return;
    }

    setExpandedProductId(product.id);
    if (offersByProduct[product.id]) return;

    setOffersLoadingId(product.id);
    try {
      const offers = await getProductOffers(product.id);
      setOffersByProduct((current) => ({ ...current, [product.id]: offers }));
    } catch {
      setOffersByProduct((current) => ({ ...current, [product.id]: [] }));
    } finally {
      setOffersLoadingId(null);
    }
  }

  function toggleCompare(productId: string) {
    setComparison([]);
    setCompareIds((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId);
      if (current.length >= 4) {
        setMessage('Puedes comparar hasta 4 productos.');
        return current;
      }
      return [...current, productId];
    });
  }

  async function runComparison() {
    if (compareIds.length < 2) {
      setMessage('Selecciona al menos 2 productos para comparar.');
      return;
    }
    setComparing(true);
    setMessage('');
    try {
      setComparison(await compareProducts(compareIds));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo realizar la comparación.');
    } finally {
      setComparing(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>EQUIPAMIENTO</Text>
            <Text style={styles.title}>Mi equipo y catálogo</Text>
            <Text style={styles.subtitle}>Organiza lo que usas y descubre productos para tus próximas salidas.</Text>
          </View>
          <Pressable style={styles.dealsButton} onPress={onOpenDeals}>
            <Ionicons name="pricetag-outline" size={19} color="#10261C" />
            <Text style={styles.dealsButtonText}>Ofertas</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <TabButton active={section === 'wardrobe'} label={`Mi equipo (${wardrobe.length})`} icon="bag-handle-outline" onPress={() => setSection('wardrobe')} />
          <TabButton active={section === 'catalog'} label="Catálogo" icon="search-outline" onPress={() => setSection('catalog')} />
        </View>

        {message ? <View style={styles.messageCard}><Text style={styles.messageText}>{message}</Text></View> : null}

        {section === 'wardrobe' ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Mi equipo</Text>
                <Text style={styles.sectionSubtitle}>Estos elementos pueden asociarse a una captura.</Text>
              </View>
              <Pressable style={styles.roundButton} onPress={() => setShowAddForm((value) => !value)}>
                <Ionicons name={showAddForm ? 'close' : 'add'} size={22} color="#173C2C" />
              </Pressable>
            </View>

            {showAddForm ? (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Agregar equipo manualmente</Text>
                <TextInput style={styles.input} value={gearName} onChangeText={setGearName} placeholder="Nombre *" placeholderTextColor="#8A958E" />
                <View style={styles.twoColumns}>
                  <TextInput style={[styles.input, styles.flexInput]} value={gearBrand} onChangeText={setGearBrand} placeholder="Marca" placeholderTextColor="#8A958E" />
                  <TextInput style={[styles.input, styles.flexInput]} value={gearModel} onChangeText={setGearModel} placeholder="Modelo" placeholderTextColor="#8A958E" />
                </View>
                <Text style={styles.miniLabel}>Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {CATEGORY_OPTIONS.filter((item) => item.key !== 'all').map((item) => (
                    <FilterChip key={item.key} active={gearCategory === item.key} label={item.label} icon={item.icon} onPress={() => setGearCategory(item.key)} />
                  ))}
                </ScrollView>
                <TextInput style={[styles.input, styles.textArea]} value={gearDescription} onChangeText={setGearDescription} placeholder="Descripción, medida, acción, capacidad, etc." placeholderTextColor="#8A958E" multiline />
                <Pressable style={[styles.primaryButton, savingGear && styles.disabled]} disabled={savingGear} onPress={() => void addCustomGear()}>
                  {savingGear ? <ActivityIndicator color="#10261C" /> : <><Ionicons name="add-circle-outline" size={19} color="#10261C" /><Text style={styles.primaryButtonText}>Guardar en Mi equipo</Text></>}
                </Pressable>
              </View>
            ) : null}

            {loadingWardrobe ? <Loading text="Cargando tu equipo…" /> : null}
            {!loadingWardrobe && wardrobe.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="bag-handle-outline" size={39} color="#315D49" />
                <Text style={styles.emptyTitle}>Todavía no agregas equipos</Text>
                <Text style={styles.emptyText}>Puedes crearlos manualmente o agregarlos directamente desde el catálogo.</Text>
                <Pressable style={styles.secondaryButton} onPress={() => setSection('catalog')}><Text style={styles.secondaryButtonText}>Explorar catálogo</Text></Pressable>
              </View>
            ) : null}

            {wardrobe.map((item) => (
              <View key={item.id} style={styles.gearCard}>
                {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.gearImage} contentFit="cover" /> : <View style={styles.gearIcon}><Ionicons name={categoryIcon(item.category)} size={25} color="#D9A441" /></View>}
                <View style={styles.gearContent}>
                  <Text style={styles.gearCategory}>{categoryLabel(item.category)}</Text>
                  <Text style={styles.gearName}>{item.name}</Text>
                  <Text style={styles.gearMeta}>{[item.brand, item.model].filter(Boolean).join(' · ') || 'Equipo personalizado'}</Text>
                  {item.description ? <Text style={styles.gearDescription}>{item.description}</Text> : null}
                </View>
                <Pressable style={[styles.deleteButton, pendingDeleteId === item.id && styles.deleteButtonConfirm]} onPress={() => void removeGear(item.id)}>
                  <Ionicons name={pendingDeleteId === item.id ? 'checkmark' : 'trash-outline'} size={18} color="#9B463A" />
                </Pressable>
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={20} color="#66756D" />
              <TextInput style={styles.search} placeholder="Buscar señuelo, caña, carrete…" placeholderTextColor="#8A958E" value={q} onChangeText={setQ} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {CATEGORY_OPTIONS.map((item) => <FilterChip key={item.key} active={category === item.key} label={item.label} icon={item.icon} onPress={() => setCategory(item.key)} />)}
            </ScrollView>

            {compareIds.length > 0 ? (
              <View style={styles.compareBar}>
                <Text style={styles.compareText}>{compareIds.length} seleccionado{compareIds.length === 1 ? '' : 's'} para comparar</Text>
                <Pressable style={[styles.compareButton, compareIds.length < 2 && styles.disabled]} disabled={compareIds.length < 2 || comparing} onPress={() => void runComparison()}>
                  {comparing ? <ActivityIndicator size="small" color="#10261C" /> : <Text style={styles.compareButtonText}>Comparar</Text>}
                </Pressable>
              </View>
            ) : null}

            {comparison.length >= 2 ? <ComparisonPanel products={comparison} onClose={() => { setComparison([]); setCompareIds([]); }} /> : null}
            {loadingProducts ? <Loading text="Buscando equipos…" /> : null}
            {!loadingProducts && filteredProducts.length === 0 ? <View style={styles.emptyCard}><Ionicons name="fish-outline" size={35} color="#315D49" /><Text style={styles.emptyTitle}>No encontramos productos</Text><Text style={styles.emptyText}>Prueba otra búsqueda o categoría.</Text></View> : null}

            {filteredProducts.map((product) => {
              const selected = compareIds.includes(product.id);
              const inWardrobe = wardrobeCatalogIds.has(product.id);
              const expanded = expandedProductId === product.id;
              return (
                <View key={product.id} style={styles.productCard}>
                  {product.media_urls?.[0] ? <Image source={{ uri: product.media_urls[0] }} style={styles.productImage} contentFit="cover" /> : <View style={styles.productImagePlaceholder}><Ionicons name="fish-outline" size={36} color="#5E7B6C" /></View>}
                  <View style={styles.productBody}>
                    <View style={styles.productTop}>
                      <View style={styles.productTitleWrap}>
                        <Text style={styles.productBrand}>{product.brand}</Text>
                        <Text style={styles.productName}>{product.name}</Text>
                        {product.model ? <Text style={styles.productModel}>{product.model}</Text> : null}
                      </View>
                      <Pressable style={[styles.compareSelect, selected && styles.compareSelectActive]} onPress={() => toggleCompare(product.id)}>
                        <Ionicons name={selected ? 'checkmark' : 'swap-horizontal-outline'} size={17} color="#173C2C" />
                      </Pressable>
                    </View>

                    <View style={styles.metricsRow}>
                      <Metric icon="star-outline" text={product.average_rating !== null ? `${product.average_rating}/5` : 'Sin nota'} />
                      <Metric icon="chatbubble-outline" text={`${product.review_count} reseñas`} />
                      <Metric icon="images-outline" text={`${product.evidence_count} evidencias`} />
                    </View>

                    <View style={styles.priceRow}>
                      <View>
                        <Text style={styles.priceLabel}>Desde</Text>
                        <Text style={styles.priceValue}>{product.lowest_price ? formatMoney(product.lowest_price, product.currency ?? 'CLP') : 'Sin precio'}</Text>
                      </View>
                      <View style={styles.productActions}>
                        <Pressable style={styles.detailButton} onPress={() => void toggleProductDetails(product)}><Text style={styles.detailButtonText}>{expanded ? 'Cerrar' : 'Detalles'}</Text></Pressable>
                        <Pressable style={[styles.addCatalogButton, inWardrobe && styles.addedButton]} disabled={inWardrobe} onPress={() => void addCatalogProduct(product)}>
                          <Ionicons name={inWardrobe ? 'checkmark-circle' : 'add-circle-outline'} size={18} color="#10261C" />
                          <Text style={styles.addCatalogButtonText}>{inWardrobe ? 'En Mi equipo' : 'Agregar'}</Text>
                        </Pressable>
                      </View>
                    </View>

                    {expanded ? (
                      <View style={styles.detailArea}>
                        {product.description ? <Text style={styles.description}>{product.description}</Text> : null}
                        <Text style={styles.detailHeading}>Especificaciones</Text>
                        {Object.keys(product.specifications ?? {}).length === 0 ? <Text style={styles.detailMuted}>Sin especificaciones cargadas.</Text> : Object.entries(product.specifications).slice(0, 8).map(([key, value]) => <View key={key} style={styles.specRow}><Text style={styles.specKey}>{humanize(key)}</Text><Text style={styles.specValue}>{formatUnknown(value)}</Text></View>)}
                        <Text style={styles.detailHeading}>Ofertas de tiendas</Text>
                        {offersLoadingId === product.id ? <ActivityIndicator color="#D9A441" /> : null}
                        {(offersByProduct[product.id] ?? []).map((offer) => <View key={offer.id} style={styles.offerRow}><View style={styles.offerText}><Text style={styles.offerMerchant}>{offer.merchant_name}</Text><Text style={styles.offerStock}>{stockLabel(offer.stock_status)}</Text></View><Text style={styles.offerPrice}>{formatMoney(offer.price, offer.currency)}</Text></View>)}
                        {offersByProduct[product.id] && offersByProduct[product.id].length === 0 ? <Text style={styles.detailMuted}>Todavía no hay ofertas de tiendas para este producto.</Text> : null}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={styles.bottomSpace} />
      </View>
    </ScrollView>
  );
}

function TabButton({ active, label, icon, onPress }: { active: boolean; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return <Pressable style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}><Ionicons name={icon} size={18} color={active ? '#10261C' : '#64746B'} /><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>;
}

function FilterChip({ active, label, icon, onPress }: { active: boolean; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}><Ionicons name={icon} size={15} color={active ? '#10261C' : '#52655B'} /><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
}

function Metric({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.metric}><Ionicons name={icon} size={14} color="#66756D" /><Text style={styles.metricText}>{text}</Text></View>;
}

function Loading({ text }: { text: string }) {
  return <View style={styles.loadingRow}><ActivityIndicator color="#D9A441" /><Text style={styles.loadingText}>{text}</Text></View>;
}

function ComparisonPanel({ products, onClose }: { products: Product[]; onClose: () => void }) {
  return <View style={styles.comparisonCard}><View style={styles.comparisonHeader}><View><Text style={styles.comparisonTitle}>Comparación</Text><Text style={styles.comparisonSubtitle}>Hasta 4 productos lado a lado.</Text></View><Pressable style={styles.closeCompare} onPress={onClose}><Ionicons name="close" size={18} color="#315D49" /></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.comparisonRow}>{products.map((product) => <View key={product.id} style={styles.comparisonItem}><Text style={styles.comparisonBrand}>{product.brand}</Text><Text style={styles.comparisonName}>{product.name}</Text><CompareLine label="Precio" value={product.lowest_price ? formatMoney(product.lowest_price, product.currency ?? 'CLP') : '—'} /><CompareLine label="Nota" value={product.average_rating !== null ? `${product.average_rating}/5` : '—'} /><CompareLine label="Reseñas" value={String(product.review_count)} /><CompareLine label="Evidencias" value={String(product.evidence_count)} /></View>)}</ScrollView></View>;
}

function CompareLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.compareLine}><Text style={styles.compareLabel}>{label}</Text><Text style={styles.compareValue}>{value}</Text></View>;
}

function normalizeCategory(value: string): CategoryKey {
  const text = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/rod|cana/.test(text)) return 'rod';
  if (/reel|carrete/.test(text)) return 'reel';
  if (/lure|senuelo|anzuelo/.test(text)) return 'lure';
  if (/line|linea|sedal/.test(text)) return 'line';
  if (/cloth|ropa|wader|chaqueta|bot/.test(text)) return 'clothing';
  return 'accessory';
}

function categoryLabel(value: string) {
  const key = normalizeCategory(value);
  return CATEGORY_OPTIONS.find((item) => item.key === key)?.label ?? value;
}

function categoryIcon(value: string): keyof typeof Ionicons.glyphMap {
  const key = normalizeCategory(value);
  return CATEGORY_OPTIONS.find((item) => item.key === key)?.icon ?? 'construct-outline';
}

function formatMoney(value: string | number, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${currency} ${value}`;
  if (currency === 'CLP') return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
  return `${currency} ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(amount)}`;
}

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatUnknown(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '—');
}

function stockLabel(value: string) {
  switch (value) {
    case 'in_stock': return 'En stock';
    case 'low_stock': return 'Últimas unidades';
    case 'out_of_stock': return 'Agotado';
    default: return 'Stock por confirmar';
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F0E5' },
  page: { flexGrow: 1, backgroundColor: '#F4F0E5' },
  container: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 25 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  headerText: { flex: 1 },
  eyebrow: { color: '#A3652E', fontWeight: '900', letterSpacing: 1.3, fontSize: 11 },
  title: { color: '#17291F', fontSize: 29, lineHeight: 35, fontWeight: '900', marginTop: 3 },
  subtitle: { color: '#6D7A72', marginTop: 4 },
  dealsButton: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: '#D9A441', paddingHorizontal: 14 },
  dealsButtonText: { color: '#10261C', fontWeight: '900', fontSize: 12 },
  tabs: { flexDirection: 'row', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 6, marginBottom: 15 },
  tabButton: { flex: 1, minHeight: 45, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  tabButtonActive: { backgroundColor: '#E7C67E' },
  tabText: { color: '#64746B', fontWeight: '800' },
  tabTextActive: { color: '#10261C', fontWeight: '900' },
  messageCard: { backgroundColor: '#F5E9D9', borderRadius: 14, padding: 12, marginBottom: 14 },
  messageText: { color: '#80572D', fontSize: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { color: '#17291F', fontSize: 21, fontWeight: '900' },
  sectionSubtitle: { color: '#728078', marginTop: 2, fontSize: 12 },
  roundButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E3ECE6', alignItems: 'center', justifyContent: 'center' },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 17, marginBottom: 14 },
  formTitle: { color: '#17291F', fontWeight: '900', fontSize: 18, marginBottom: 12 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#DDE2DC', borderRadius: 13, backgroundColor: '#F8F8F4', paddingHorizontal: 13, color: '#1B2D23', marginBottom: 10 },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  flexInput: { flex: 1, minWidth: 190 },
  miniLabel: { color: '#526159', fontSize: 11, fontWeight: '900', marginTop: 2, marginBottom: 7 },
  textArea: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
  primaryButton: { minHeight: 49, borderRadius: 14, backgroundColor: '#D9A441', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  primaryButtonText: { color: '#10261C', fontWeight: '900' },
  secondaryButton: { marginTop: 13, minHeight: 42, borderRadius: 12, backgroundColor: '#E3ECE6', paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#315D49', fontWeight: '900' },
  disabled: { opacity: 0.55 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 13, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14 },
  loadingText: { color: '#6D7A72', fontSize: 12 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 20, minHeight: 170, alignItems: 'center', justifyContent: 'center', padding: 20, marginBottom: 12 },
  emptyTitle: { color: '#17291F', fontWeight: '900', fontSize: 17, marginTop: 8 },
  emptyText: { color: '#718078', textAlign: 'center', marginTop: 4, maxWidth: 480 },
  gearCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  gearImage: { width: 68, height: 68, borderRadius: 14, backgroundColor: '#E3ECE6' },
  gearIcon: { width: 54, height: 54, borderRadius: 15, backgroundColor: '#173C2C', alignItems: 'center', justifyContent: 'center' },
  gearContent: { flex: 1 },
  gearCategory: { color: '#A3652E', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  gearName: { color: '#17291F', fontSize: 16, fontWeight: '900', marginTop: 2 },
  gearMeta: { color: '#718078', fontSize: 11, marginTop: 2 },
  gearDescription: { color: '#617068', fontSize: 12, marginTop: 6, lineHeight: 18 },
  deleteButton: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#F7E5E1', alignItems: 'center', justifyContent: 'center' },
  deleteButtonConfirm: { backgroundColor: '#F0C7BE' },
  searchBox: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#DDE2DC', backgroundColor: '#FFFFFF', borderRadius: 15, paddingHorizontal: 14, marginBottom: 11 },
  search: { flex: 1, height: 50, color: '#1B2D23', fontSize: 15 },
  chipRow: { gap: 8, paddingBottom: 12 },
  filterChip: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 11, backgroundColor: '#EEF1ED', borderWidth: 1, borderColor: '#E0E4E0' },
  filterChipActive: { backgroundColor: '#E7C67E', borderColor: '#D9A441' },
  filterText: { color: '#52655B', fontSize: 11, fontWeight: '800' },
  filterTextActive: { color: '#10261C', fontWeight: '900' },
  compareBar: { backgroundColor: '#173C2C', borderRadius: 16, padding: 12, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  compareText: { flex: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  compareButton: { minHeight: 38, borderRadius: 11, backgroundColor: '#D9A441', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  compareButtonText: { color: '#10261C', fontWeight: '900' },
  comparisonCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, marginBottom: 14 },
  comparisonHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  comparisonTitle: { color: '#17291F', fontSize: 18, fontWeight: '900' },
  comparisonSubtitle: { color: '#728078', fontSize: 11, marginTop: 2 },
  closeCompare: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E3ECE6', alignItems: 'center', justifyContent: 'center' },
  comparisonRow: { gap: 9 },
  comparisonItem: { width: 210, borderRadius: 15, backgroundColor: '#F7F7F2', padding: 12 },
  comparisonBrand: { color: '#A3652E', fontSize: 10, fontWeight: '900' },
  comparisonName: { color: '#17291F', fontWeight: '900', marginTop: 2, marginBottom: 9 },
  compareLine: { borderTopWidth: 1, borderTopColor: '#E3E7E2', paddingVertical: 6 },
  compareLabel: { color: '#7A857E', fontSize: 10 },
  compareValue: { color: '#30483B', fontWeight: '800', fontSize: 12, marginTop: 1 },
  productCard: { backgroundColor: '#FFFFFF', borderRadius: 21, overflow: 'hidden', marginBottom: 13, flexDirection: 'row', flexWrap: 'wrap' },
  productImage: { width: 220, minHeight: 220, flexGrow: 0, backgroundColor: '#E3ECE6' },
  productImagePlaceholder: { width: 220, minHeight: 220, backgroundColor: '#E3ECE6', alignItems: 'center', justifyContent: 'center' },
  productBody: { flex: 1, minWidth: 300, padding: 16 },
  productTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  productTitleWrap: { flex: 1 },
  productBrand: { color: '#A3652E', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  productName: { color: '#17291F', fontSize: 20, fontWeight: '900', marginTop: 2 },
  productModel: { color: '#718078', fontSize: 12, marginTop: 2 },
  compareSelect: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEF1ED', alignItems: 'center', justifyContent: 'center' },
  compareSelectActive: { backgroundColor: '#E7C67E' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F2F3EF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  metricText: { color: '#66756D', fontSize: 10, fontWeight: '700' },
  priceRow: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  priceLabel: { color: '#7A857E', fontSize: 10 },
  priceValue: { color: '#A44B25', fontSize: 19, fontWeight: '900', marginTop: 1 },
  productActions: { marginLeft: 'auto', flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  detailButton: { minHeight: 39, borderRadius: 11, backgroundColor: '#E3ECE6', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  detailButtonText: { color: '#315D49', fontWeight: '900', fontSize: 11 },
  addCatalogButton: { minHeight: 39, borderRadius: 11, backgroundColor: '#D9A441', paddingHorizontal: 12, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  addedButton: { backgroundColor: '#CFE1D6' },
  addCatalogButtonText: { color: '#10261C', fontWeight: '900', fontSize: 11 },
  detailArea: { marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: '#E8ECE7' },
  description: { color: '#5E6D64', lineHeight: 19, fontSize: 12 },
  detailHeading: { color: '#26392F', fontWeight: '900', marginTop: 12, marginBottom: 6 },
  detailMuted: { color: '#7A857E', fontSize: 11 },
  specRow: { flexDirection: 'row', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F0F2EF' },
  specKey: { width: 130, color: '#7A857E', fontSize: 10 },
  specValue: { flex: 1, color: '#40564A', fontSize: 11, fontWeight: '700' },
  offerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F2EF' },
  offerText: { flex: 1 },
  offerMerchant: { color: '#2E5B45', fontWeight: '900', fontSize: 12 },
  offerStock: { color: '#7A857E', fontSize: 10, marginTop: 2 },
  offerPrice: { color: '#A44B25', fontWeight: '900' },
  bottomSpace: { height: 34 },
});
