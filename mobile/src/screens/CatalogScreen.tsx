import { useEffect, useState } from 'react';
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

import { ProductCard } from '../components/ProductCard';
import { getProducts } from '../services/api';
import type { Product } from '../types/api';

export function CatalogScreen({
  onOpenDeals,
}: {
  onOpenDeals: () => void;
}) {
  const [products, setProducts] =
    useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => {
      setLoading(true);
      getProducts(q)
        .then(setProducts)
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(id);
  }, [q]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              CATÁLOGO INTELIGENTE
            </Text>
            <Text style={styles.title}>
              Conoce el equipo antes de comprarlo
            </Text>
            <Text style={styles.subtitle}>
              Cañas, carretes, señuelos y equipamiento outdoor.
            </Text>
          </View>

          <Pressable
            style={styles.dealsButton}
            onPress={onOpenDeals}
          >
            <Ionicons
              name="pricetag-outline"
              size={19}
              color="#10261C"
            />
            <Text style={styles.dealsButtonText}>
              Ofertas
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#66756D"
          />
          <TextInput
            style={styles.search}
            placeholder="Buscar señuelo, caña, carrete…"
            placeholderTextColor="#8A958E"
            value={q}
            onChangeText={setQ}
          />
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#D9A441" />
            <Text style={styles.loadingText}>
              Buscando equipos…
            </Text>
          </View>
        ) : null}

        {!loading && products.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="fish-outline"
              size={35}
              color="#315D49"
            />
            <Text style={styles.emptyTitle}>
              No encontramos productos
            </Text>
            <Text style={styles.emptyText}>
              Prueba otra búsqueda o revisa las ofertas disponibles.
            </Text>
          </View>
        ) : null}

        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}

        <View style={styles.bottomSpace} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F0E5',
  },
  page: {
    flexGrow: 1,
    backgroundColor: '#F4F0E5',
  },
  container: {
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: '#A3652E',
    fontWeight: '900',
    letterSpacing: 1.3,
    fontSize: 11,
  },
  title: {
    color: '#17291F',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    marginTop: 3,
  },
  subtitle: {
    color: '#6D7A72',
    marginTop: 4,
  },
  dealsButton: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#D9A441',
    paddingHorizontal: 14,
  },
  dealsButtonText: {
    color: '#10261C',
    fontWeight: '900',
    fontSize: 12,
  },
  searchBox: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: '#DDE2DC',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 14,
    marginBottom: 15,
  },
  search: {
    flex: 1,
    height: 50,
    color: '#1B2D23',
    fontSize: 15,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 13,
  },
  loadingText: {
    color: '#6D7A72',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    color: '#17291F',
    fontWeight: '900',
    fontSize: 17,
    marginTop: 8,
  },
  emptyText: {
    color: '#718078',
    textAlign: 'center',
    marginTop: 4,
  },
  bottomSpace: {
    height: 30,
  },
});
