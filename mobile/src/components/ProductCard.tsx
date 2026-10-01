import { StyleSheet, Text, View } from 'react-native';
import type { Product } from '../types/api';

export function ProductCard({ product }: { product: Product }) {
  return (
    <View style={styles.card}>
      <Text style={styles.category}>{product.category.toUpperCase()}</Text>
      <Text style={styles.title}>{product.brand} {product.name}</Text>
      <Text style={styles.description}>{product.description ?? 'Sin descripción todavía.'}</Text>
      <View style={styles.row}>
        <Text style={styles.meta}>Evidencias: {product.evidence_count}</Text>
        <Text style={styles.meta}>★ {product.average_rating ?? '—'}</Text>
      </View>
      <Text style={styles.price}>
        {product.lowest_price ? `Desde ${product.currency ?? ''} ${product.lowest_price}` : 'Precio por confirmar'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#F4F1E8', borderRadius: 18, padding: 16, gap: 8, marginBottom: 12 },
  category: { color: '#6A765E', fontWeight: '800', fontSize: 12 },
  title: { color: '#15241C', fontSize: 19, fontWeight: '800' },
  description: { color: '#415047', lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: '#536157', fontWeight: '600' },
  price: { color: '#A75727', fontWeight: '800', marginTop: 4 },
});
