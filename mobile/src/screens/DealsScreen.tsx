import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getDeals } from '../services/api';
import type { Deal } from '../types/api';

export function DealsScreen() {
  const [deals, setDeals] = useState<Deal[]>([]);
  useEffect(() => { getDeals().then(setDeals); }, []);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>CAZADOR DE OFERTAS</Text>
      <Text style={styles.title}>Precios reportados por la comunidad</Text>
      {deals.length === 0 ? <Text style={styles.empty}>Todavía no hay ofertas reportadas.</Text> : null}
      {deals.map((deal) => (
        <View style={styles.card} key={deal.id}>
          <Text style={styles.merchant}>{deal.merchant_name}</Text>
          <Text style={styles.price}>{deal.currency} {deal.price}</Text>
          {deal.normal_price ? <Text style={styles.oldPrice}>Antes: {deal.currency} {deal.normal_price}</Text> : null}
          <Text style={styles.meta}>📍 {deal.store_region ?? 'Internet'} · ✅ {deal.available_votes} · ❌ {deal.expired_votes}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 18, backgroundColor: '#E9E5D8', minHeight: '100%', gap: 12 },
  eyebrow: { color: '#9A602E', fontWeight: '900' },
  title: { fontSize: 27, lineHeight: 33, fontWeight: '900', color: '#14251C' },
  empty: { color: '#58645D' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, gap: 4 },
  merchant: { color: '#2E5B45', fontWeight: '800' },
  price: { color: '#A44B25', fontWeight: '900', fontSize: 24 },
  oldPrice: { color: '#737B76', textDecorationLine: 'line-through' },
  meta: { color: '#526057', marginTop: 6 },
});
