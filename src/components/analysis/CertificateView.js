import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card, Button, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/theme';

export default function CertificateView({ 
  visible, 
  onDismiss, 
  certificateData, 
  analysisData,
  onDownload,
  onShare 
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Certificate Generated</Text>
            <TouchableOpacity onPress={onDismiss}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Card style={styles.certificateCard}>
              <Card.Content>
                <View style={styles.certificateHeader}>
                  <Icon name="verified" size={40} color={colors.success} />
                  <Text style={styles.certificateTitle}>
                    GEMSTONE AUTHENTICATION CERTIFICATE
                  </Text>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Certificate ID:</Text>
                  <Text style={styles.detailValue}>{certificateData.certificate_id}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gemstone Type:</Text>
                  <Text style={[styles.detailValue, styles.bold]}>
                    {analysisData.results.predicted_class}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Confidence:</Text>
                  <Text style={styles.detailValue}>
                    {(analysisData.results.confidence * 100).toFixed(1)}%
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date Issued:</Text>
                  <Text style={styles.detailValue}>
                    {new Date().toLocaleDateString()}
                  </Text>
                </View>

                <Divider style={styles.divider} />

                <Text style={styles.footerText}>
                  This certificate is digitally generated and verified by GemDetect AI System
                </Text>
              </Card.Content>
            </Card>

            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={onDownload}
                style={styles.actionButton}
                icon="download"
              >
                Download PDF
              </Button>
              
              <Button
                mode="outlined"
                onPress={onShare}
                style={styles.actionButton}
                icon="share"
              >
                Share Certificate
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  certificateCard: {
    borderRadius: 15,
    elevation: 3,
    marginBottom: 20,
  },
  certificateHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  certificateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 10,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
  },
  bold: {
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
  actions: {
    marginTop: 10,
  },
  actionButton: {
    marginBottom: 10,
    borderRadius: 25,
  },
});