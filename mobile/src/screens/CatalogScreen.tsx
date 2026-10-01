import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { ProductCard } from '../components/ProductCard';
import { getProducts } from '../services/api';
import type { Product } from '../types/api';

export function CatalogScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => {
      setLoading(true);
      getProducts(q).then(setProducts).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>CATÁLOGO INTELIGENTE</Text>
      <Text style={styles.title}>Conoce el equipo antes de comprarlo</Text>
      <TextInput style={styles.search} placeholder="Buscar señuelo, caña, carrete…" value={q} onChangeText={setQ} />
      {loading ? <ActivityIndicator /> : null}
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 18, backgroundColor: '#10261C', minHeight: '100%' },
  eyebrow: { color: '#D9A441', fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 27, lineHeight: 33, fontWeight: '900', marginVertical: 10 },
  search: { height: 50, backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, marginBottom: 16, fontSize: 16 },
});
