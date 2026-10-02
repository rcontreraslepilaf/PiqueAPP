import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { getDeals } from '../services/api';
import type { Deal } from '../types/api';

export function DealsScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeals()
      .then(setDeals)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={onBack}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#FFFFFF"
            />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              CAZADOR DE OFERTAS
            </Text>
            <Text style={styles.title}>
              Precios reportados por la comunidad
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color="#D9A441"
            />
          </View>
        ) : null}

        {!loading && deals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="pricetag-outline"
              size={38}
              color="#315D49"
            />
            <Text style={styles.emptyTitle}>
              Todavía no hay ofertas reportadas
            </Text>
          </View>
        ) : null}

        {deals.map((deal) => (
          <View
            style={styles.card}
            key={deal.id}
          >
            <View style={styles.cardTop}>
              <Text style={styles.merchant}>
                {deal.merchant_name}
              </Text>
              <View style={styles.voteBadge}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={14}
                  color="#237447"
                />
                <Text style={styles.voteText}>
                  {deal.available_votes}
                </Text>
              </View>
            </View>

            <Text style={styles.price}>
              {deal.currency} {deal.price}
            </Text>

            {deal.normal_price ? (
              <Text style={styles.oldPrice}>
                Antes: {deal.currency} {deal.normal_price}
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              <Ionicons
                name="location-outline"
                size={15}
                color="#66756D"
              />
              <Text style={styles.meta}>
                {deal.store_region ?? 'Internet'}
              </Text>
            </View>
          </View>
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
    maxWidth: 950,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 18,
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#123D2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: '#A3652E',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.3,
  },
  title: {
    color: '#17291F',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 3,
  },
  loadingCard: {
    minHeight: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    minHeight: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    color: '#17291F',
    fontWeight: '900',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 16,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  merchant: {
    color: '#2E5B45',
    fontWeight: '900',
  },
  voteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DDF0E3',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  voteText: {
    color: '#237447',
    fontSize: 10,
    fontWeight: '900',
  },
  price: {
    color: '#A44B25',
    fontWeight: '900',
    fontSize: 25,
    marginTop: 7,
  },
  oldPrice: {
    color: '#737B76',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 9,
  },
  meta: {
    color: '#526057',
    fontSize: 12,
  },
  bottomSpace: {
    height: 30,
  },
});
