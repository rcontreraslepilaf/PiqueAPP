import {
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

type ShareMenuProps = {
  visible: boolean;
  onClose: () => void;

  title: string;
  text: string;
  url: string;
};

export function ShareMenu({
  visible,
  onClose,
  title,
  text,
  url,
}: ShareMenuProps) {
  const fullText = `${title}\n\n${text}\n\n${url}`;

  async function shareWhatsApp() {
    const target =
      `https://wa.me/?text=${encodeURIComponent(fullText)}`;

    await Linking.openURL(target);
  }

  async function shareFacebook() {
    const target =
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

    await Linking.openURL(target);
  }

  async function shareInstagramOrOther() {
    try {
      await Share.share({
        title,
        message: fullText,
        url,
      });
    } catch (error) {
      console.log('Error al compartir:', error);
    }
  }

  async function copyLink() {
    await Clipboard.setStringAsync(url);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable
          style={styles.sheet}
          onPress={() => {}}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                Compartir aventura
              </Text>

              <Text style={styles.subtitle}>
                Invita a otros a verla en Pesca & Outdoor
              </Text>
            </View>

            <Pressable
              style={styles.close}
              onPress={onClose}
            >
              <Ionicons
                name="close"
                size={22}
                color="#294038"
              />
            </Pressable>
          </View>

          <View style={styles.options}>
            <ShareOption
              icon="logo-whatsapp"
              title="WhatsApp"
              subtitle="Enviar a contactos o grupos"
              onPress={shareWhatsApp}
            />

            <ShareOption
              icon="logo-facebook"
              title="Facebook"
              subtitle="Compartir publicación o grupo"
              onPress={shareFacebook}
            />

            <ShareOption
              icon="logo-instagram"
              title="Instagram / otras apps"
              subtitle={
                Platform.OS === 'web'
                  ? 'Disponible completamente en móvil'
                  : 'Abrir menú de compartir'
              }
              onPress={shareInstagramOrOther}
            />

            <ShareOption
              icon="copy-outline"
              title="Copiar enlace"
              subtitle="Copiar para compartir manualmente"
              onPress={copyLink}
            />

            <ShareOption
              icon="share-social-outline"
              title="Más opciones"
              subtitle="Usar el menú de compartir del dispositivo"
              onPress={shareInstagramOrOther}
            />
          </View>

          <View style={styles.note}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#49735E"
            />

            <Text style={styles.noteText}>
              Nunca compartiremos las coordenadas privadas de una zona secreta.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ShareOption({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.option,
        pressed && styles.optionPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.iconBox}>
        <Ionicons
          name={icon}
          size={24}
          color="#174A36"
        />
      </View>

      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>
          {title}
        </Text>

        <Text style={styles.optionSubtitle}>
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#839087"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 20, 14, 0.55)',
    justifyContent: 'flex-end',
  },

  sheet: {
    backgroundColor: '#F7F4EB',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 30,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },

  handle: {
    width: 50,
    height: 5,
    borderRadius: 10,
    backgroundColor: '#C8CEC9',
    alignSelf: 'center',
    marginBottom: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 15,
    marginBottom: 20,
  },

  title: {
    color: '#17271F',
    fontSize: 22,
    fontWeight: '900',
  },

  subtitle: {
    color: '#708078',
    fontSize: 13,
    marginTop: 3,
  },

  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E5EAE6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  options: {
    gap: 8,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 13,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
  },

  optionPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#E3EEE7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  optionText: {
    flex: 1,
  },

  optionTitle: {
    color: '#1A2A22',
    fontSize: 15,
    fontWeight: '900',
  },

  optionSubtitle: {
    color: '#7A877F',
    fontSize: 12,
    marginTop: 2,
  },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 18,
    padding: 13,
    backgroundColor: '#E6EEE8',
    borderRadius: 15,
  },

  noteText: {
    flex: 1,
    color: '#52635A',
    fontSize: 12,
    lineHeight: 17,
  },
});