import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useExploration } from '../context/ExplorationContext';
import {
  createDeal,
  getDeals,
  getProducts,
  validateDeal,
} from '../services/api';
import type {
  Deal,
  OfferValidationStatus,
  Product,
} from '../types/api';

type Filter = 'all' | OfferValidationStatus;

export function DealsScreen({
  token,
  onBack,
}: {
  token: string;
  onBack: () => void;
}) {
  const { place } = useExploration();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const [productId, setProductId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [price, setPrice] = useState('');
  const [normalPrice, setNormalPrice] = useState('');
  const [region, setRegion] = useState(place?.region ?? place?.locality ?? '');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const [dealRows, productRows] = await Promise.all([
        getDeals(),
        getProducts('', { limit: 100 }),
      ]);
      setDeals(dealRows);
      setProducts(productRows);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudieron cargar las ofertas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!region.trim() && place) {
      setRegion(place.region ?? place.locality ?? '');
    }
  }, [place]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const filteredDeals = useMemo(() => {
    if (filter === 'all') return deals;
    return deals.filter((deal) => {
      if (filter === 'available') {
        return deal.available_votes >= deal.expired_votes && deal.available_votes >= deal.wrong_price_votes;
      }
      if (filter === 'expired') {
        return deal.expired_votes > deal.available_votes && deal.expired_votes >= deal.wrong_price_votes;
      }
      return deal.wrong_price_votes > deal.available_votes && deal.wrong_price_votes > deal.expired_votes;
    });
  }, [deals, filter]);

  async function submitDeal() {
    const parsedPrice = parseMoney(price);
    const parsedNormalPrice = normalPrice.trim() ? parseMoney(normalPrice) : null;

    if (!productId) {
      setMessage('Selecciona el producto de la oferta.');
      return;
    }
    if (!merchant.trim()) {
      setMessage('Escribe el nombre de la tienda o vendedor.');
      return;
    }
    if (parsedPrice === null || parsedPrice <= 0) {
      setMessage('Ingresa un precio válido.');
      return;
    }
    if (normalPrice.trim() && (parsedNormalPrice === null || parsedNormalPrice <= 0)) {
      setMessage('El precio normal no es válido.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const created = await createDeal(token, {
        product_id: productId,
        merchant_name: merchant.trim(),
        price: parsedPrice,
        normal_price: parsedNormalPrice,
        currency: 'CLP',
        url: url.trim() || null,
        notes: notes.trim() || null,
        store_region: region.trim() || null,
      });
      setDeals((current) => [created, ...current]);
      setMerchant('');
      setPrice('');
      setNormalPrice('');
      setUrl('');
      setNotes('');
      setProductId('');
      setShowForm(false);
      setMessage('Oferta reportada correctamente. Ahora la comunidad puede validarla.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo reportar la oferta.');
    } finally {
      setSaving(false);
    }
  }

  async function vote(deal: Deal, status: OfferValidationStatus) {
    setValidatingId(deal.id);
    setMessage('');
    try {
      const updated = await validateDeal(token, deal.id, status);
      setDeals((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo registrar tu validación.');
    } finally {
      setValidatingId(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>CAZADOR DE OFERTAS</Text>
            <Text style={styles.title}>Precios reportados por la comunidad</Text>
            <Text style={styles.subtitle}>Compara precios y ayuda a confirmar si una oferta sigue vigente.</Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => setShowForm((value) => !value)}>
            <Ionicons name={showForm ? 'close' : 'add'} size={22} color="#173C2C" />
          </Pressable>
        </View>

        {place ? (
          <View style={styles.locationBanner}>
            <Ionicons name="location-outline" size={20} color="#315D49" />
            <View style={styles.locationText}>
              <Text style={styles.locationTitle}>Zona de referencia</Text>
              <Text style={styles.locationValue}>{place.label}</Text>
            </View>
          </View>
        ) : null}

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Reportar una oferta</Text>
            <Text style={styles.fieldLabel}>Producto *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productPicker}>
              {products.slice(0, 30).map((product) => (
                <Pressable key={product.id} style={[styles.productOption, productId === product.id && styles.productOptionActive]} onPress={() => setProductId(product.id)}>
                  <Text style={[styles.productOptionBrand, productId === product.id && styles.productOptionTextActive]}>{product.brand}</Text>
                  <Text style={[styles.productOptionName, productId === product.id && styles.productOptionTextActive]} numberOfLines={2}>{product.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput style={styles.input} value={merchant} onChangeText={setMerchant} placeholder="Tienda o vendedor *" placeholderTextColor="#8A958E" />
            <View style={styles.twoColumns}>
              <TextInput style={[styles.input, styles.flexInput]} value={price} onChangeText={setPrice} placeholder="Precio oferta *" placeholderTextColor="#8A958E" keyboardType="decimal-pad" />
              <TextInput style={[styles.input, styles.flexInput]} value={normalPrice} onChangeText={setNormalPrice} placeholder="Precio normal" placeholderTextColor="#8A958E" keyboardType="decimal-pad" />
            </View>
            <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder="Región o zona" placeholderTextColor="#8A958E" />
            <TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="Link de la oferta (opcional)" placeholderTextColor="#8A958E" autoCapitalize="none" />
            <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Notas: stock, talla, despacho, local, etc." placeholderTextColor="#8A958E" multiline />
            <Pressable style={[styles.saveButton, saving && styles.disabled]} disabled={saving} onPress={() => void submitDeal()}>
              {saving ? <ActivityIndicator color="#10261C" /> : <><Ionicons name="pricetag-outline" size={19} color="#10261C" /><Text style={styles.saveButtonText}>Publicar oferta</Text></>}
            </Pressable>
          </View>
        ) : null}

        {message ? <View style={styles.messageCard}><Text style={styles.messageText}>{message}</Text></View> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <FilterChip active={filter === 'all'} label={`Todas (${deals.length})`} onPress={() => setFilter('all')} />
          <FilterChip active={filter === 'available'} label="Disponibles" onPress={() => setFilter('available')} />
          <FilterChip active={filter === 'expired'} label="Agotadas" onPress={() => setFilter('expired')} />
          <FilterChip active={filter === 'wrong_price'} label="Precio incorrecto" onPress={() => setFilter('wrong_price')} />
        </ScrollView>

        {loading ? <View style={styles.loadingCard}><ActivityIndicator size="large" color="#D9A441" /></View> : null}
        {!loading && filteredDeals.length === 0 ? <View style={styles.emptyCard}><Ionicons name="pricetag-outline" size={38} color="#315D49" /><Text style={styles.emptyTitle}>No hay ofertas en este filtro</Text><Text style={styles.emptyText}>Puedes ser el primero en reportar una.</Text></View> : null}

        {filteredDeals.map((deal) => {
          const product = productMap.get(deal.product_id);
          const busy = validatingId === deal.id;
          return (
            <View style={styles.card} key={deal.id}>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.merchant}>{deal.merchant_name}</Text>
                  <Text style={styles.productName}>{product ? `${product.brand} · ${product.name}` : 'Producto del catálogo'}</Text>
                </View>
                <StatusBadge deal={deal} />
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>{formatMoney(deal.price, deal.currency)}</Text>
                {deal.normal_price ? <Text style={styles.oldPrice}>{formatMoney(deal.normal_price, deal.currency)}</Text> : null}
                {deal.normal_price ? <Text style={styles.discount}>{discountLabel(deal.price, deal.normal_price)}</Text> : null}
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={15} color="#66756D" />
                <Text style={styles.meta}>{deal.store_region ?? 'Internet / ubicación no informada'}</Text>
              </View>
              {deal.notes ? <Text style={styles.notes}>{deal.notes}</Text> : null}

              <View style={styles.votesSummary}>
                <VoteCount icon="checkmark-circle-outline" text={`${deal.available_votes} disponible`} />
                <VoteCount icon="close-circle-outline" text={`${deal.expired_votes} agotada`} />
                <VoteCount icon="alert-circle-outline" text={`${deal.wrong_price_votes} precio incorrecto`} />
              </View>

              <View style={styles.actions}>
                <Pressable style={[styles.voteButton, styles.availableButton, busy && styles.disabled]} disabled={busy} onPress={() => void vote(deal, 'available')}><Ionicons name="checkmark" size={16} color="#237447" /><Text style={styles.availableText}>Disponible</Text></Pressable>
                <Pressable style={[styles.voteButton, busy && styles.disabled]} disabled={busy} onPress={() => void vote(deal, 'expired')}><Ionicons name="close" size={16} color="#80572D" /><Text style={styles.voteButtonText}>Agotada</Text></Pressable>
                <Pressable style={[styles.voteButton, busy && styles.disabled]} disabled={busy} onPress={() => void vote(deal, 'wrong_price')}><Ionicons name="alert-outline" size={16} color="#9B463A" /><Text style={styles.wrongText}>Precio incorrecto</Text></Pressable>
                {deal.url ? <Pressable style={styles.linkButton} onPress={() => void Linking.openURL(deal.url!)}><Ionicons name="open-outline" size={16} color="#315D49" /><Text style={styles.linkText}>Ver oferta</Text></Pressable> : null}
              </View>
            </View>
          );
        })}

        <View style={styles.bottomSpace} />
      </View>
    </ScrollView>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
}

function VoteCount({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.voteCount}><Ionicons name={icon} size={14} color="#607168" /><Text style={styles.voteCountText}>{text}</Text></View>;
}

function StatusBadge({ deal }: { deal: Deal }) {
  const values = [
    { key: 'available', count: deal.available_votes, label: 'Disponible' },
    { key: 'expired', count: deal.expired_votes, label: 'Agotada' },
    { key: 'wrong', count: deal.wrong_price_votes, label: 'Revisar precio' },
  ];
  const max = Math.max(...values.map((item) => item.count));
  const top = values.find((item) => item.count === max);
  const label = max === 0 ? 'Sin validar' : top?.label ?? 'Sin validar';
  return <View style={styles.statusBadge}><Text style={styles.statusText}>{label}</Text></View>;
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: string | number, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${currency} ${value}`;
  if (currency === 'CLP') return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
  return `${currency} ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(amount)}`;
}

function discountLabel(price: string, normal: string) {
  const current = Number(price);
  const original = Number(normal);
  if (!Number.isFinite(current) || !Number.isFinite(original) || original <= current || original <= 0) return '';
  const percent = Math.round((1 - current / original) * 100);
  return `-${percent}%`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F0E5' },
  page: { flexGrow: 1, backgroundColor: '#F4F0E5' },
  container: { width: '100%', maxWidth: 980, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 25 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 },
  backButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#123D2D', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  eyebrow: { color: '#A3652E', fontWeight: '900', fontSize: 11, letterSpacing: 1.3 },
  title: { color: '#17291F', fontSize: 28, fontWeight: '900', marginTop: 3 },
  subtitle: { color: '#6D7A72', fontSize: 12, marginTop: 3 },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E3ECE6', alignItems: 'center', justifyContent: 'center' },
  locationBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#E3ECE6', borderRadius: 15, padding: 12, marginBottom: 14 },
  locationText: { flex: 1 },
  locationTitle: { color: '#315D49', fontWeight: '900', fontSize: 10 },
  locationValue: { color: '#607168', fontSize: 11, marginTop: 2 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 21, padding: 17, marginBottom: 14 },
  formTitle: { color: '#17291F', fontSize: 19, fontWeight: '900', marginBottom: 12 },
  fieldLabel: { color: '#4C5D53', fontSize: 11, fontWeight: '900', marginBottom: 7 },
  productPicker: { gap: 8, paddingBottom: 11 },
  productOption: { width: 155, minHeight: 67, borderRadius: 13, borderWidth: 1, borderColor: '#DDE2DC', backgroundColor: '#F8F8F4', padding: 10 },
  productOptionActive: { backgroundColor: '#E7C67E', borderColor: '#D9A441' },
  productOptionBrand: { color: '#A3652E', fontSize: 9, fontWeight: '900' },
  productOptionName: { color: '#354A3E', fontSize: 11, fontWeight: '800', marginTop: 2 },
  productOptionTextActive: { color: '#10261C' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#DDE2DC', borderRadius: 13, backgroundColor: '#F8F8F4', paddingHorizontal: 13, color: '#1B2D23', marginBottom: 10 },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  flexInput: { flex: 1, minWidth: 190 },
  textArea: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  saveButton: { minHeight: 49, borderRadius: 14, backgroundColor: '#D9A441', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  saveButtonText: { color: '#10261C', fontWeight: '900' },
  disabled: { opacity: 0.55 },
  messageCard: { backgroundColor: '#F5E9D9', borderRadius: 14, padding: 12, marginBottom: 14 },
  messageText: { color: '#80572D', fontSize: 12 },
  filters: { gap: 8, paddingBottom: 14 },
  filterChip: { minHeight: 38, borderRadius: 999, backgroundColor: '#EEF1ED', borderWidth: 1, borderColor: '#E0E4E0', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: '#E7C67E', borderColor: '#D9A441' },
  filterText: { color: '#52655B', fontSize: 11, fontWeight: '800' },
  filterTextActive: { color: '#10261C', fontWeight: '900' },
  loadingCard: { minHeight: 170, backgroundColor: '#FFFFFF', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { minHeight: 180, backgroundColor: '#FFFFFF', borderRadius: 22, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyTitle: { color: '#17291F', fontWeight: '900', marginTop: 8 },
  emptyText: { color: '#718078', marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 19, padding: 16, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitleWrap: { flex: 1 },
  merchant: { color: '#2E5B45', fontWeight: '900', fontSize: 16 },
  productName: { color: '#77827B', fontSize: 11, marginTop: 2 },
  statusBadge: { backgroundColor: '#E3ECE6', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { color: '#315D49', fontSize: 9, fontWeight: '900' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 9, marginTop: 9 },
  price: { color: '#A44B25', fontWeight: '900', fontSize: 25 },
  oldPrice: { color: '#737B76', textDecorationLine: 'line-through', fontSize: 12 },
  discount: { color: '#237447', fontWeight: '900', fontSize: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  meta: { color: '#526057', fontSize: 12 },
  notes: { color: '#69776F', fontSize: 12, lineHeight: 18, marginTop: 8 },
  votesSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  voteCount: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F0', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  voteCountText: { color: '#607168', fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#ECEFEA' },
  voteButton: { minHeight: 37, borderRadius: 11, backgroundColor: '#F5E9D9', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  voteButtonText: { color: '#80572D', fontWeight: '900', fontSize: 10 },
  availableButton: { backgroundColor: '#DDF0E3' },
  availableText: { color: '#237447', fontWeight: '900', fontSize: 10 },
  wrongText: { color: '#9B463A', fontWeight: '900', fontSize: 10 },
  linkButton: { minHeight: 37, borderRadius: 11, backgroundColor: '#E3ECE6', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  linkText: { color: '#315D49', fontWeight: '900', fontSize: 10 },
  bottomSpace: { height: 32 },
});
