import { colors, radius, spacingX } from '@/constants/theme';
import { ImageUploadProps } from '@/type';
import { verticalScale } from '@/utils/styling';
import * as ImagePicker from 'expo-image-picker';
import * as Icons from 'phosphor-react-native';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Typo from './Typo';

const ImageUpload = ({
  file = null,
  onSelect,
  onClear,
  containerStyle,
  imageStyle,
  placeholder = "Upload Image"
}: ImageUploadProps) => {
  
  // handle image pick
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access gallery is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // square crop
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      onSelect?.(result.assets[0].uri); // send back selected image
    }
  };

  return (
    <View>
      {!file && (
        <TouchableOpacity 
          style={[styles.inputContainer, containerStyle && containerStyle]} 
          onPress={handlePickImage}
        >
          <Icons.Upload color={colors.neutral200} size={22} />
          {placeholder && <Typo size={15} color={colors.neutral200}>{placeholder}</Typo>}
        </TouchableOpacity>
      )}

      {file && (
        <View style={styles.imageWrapper}>
          <Image 
            source={{ uri: file }} 
            style={[styles.image, imageStyle && imageStyle]} 
          />
          <TouchableOpacity style={styles.clearButton} onPress={onClear}>
            <Icons.XCircle size={26} color={colors.red} weight="fill" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ImageUpload;

const styles = StyleSheet.create({
  inputContainer: {
    height: verticalScale(60),
    backgroundColor: colors.neutral700,
    borderRadius: radius._20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacingX._10,
    borderWidth: 1,
    borderColor: colors.neutral500,
    borderStyle: "dashed",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    paddingHorizontal: spacingX._15,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: verticalScale(160),
    borderRadius: radius._20,
    overflow: "hidden",
    backgroundColor: colors.neutral800,
    borderWidth: 1,
    borderColor: colors.neutral600,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  clearButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)", // semi-transparent
    borderRadius: 25,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
});
