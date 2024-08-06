import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Modal, TouchableWithoutFeedback, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firebase from '@react-native-firebase/app';
import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';
import * as ImagePicker from 'react-native-image-picker';
import ImageCropPicker from 'react-native-image-crop-picker';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';


const Profile = () => {
    const [user, setUser] = useState(null);
    const [friendsCount, setFriendsCount] = useState(0);
    const [conversationsCount, setConversationsCount] = useState(0);
    const [groupsCount, setGroupsCount] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [transferred, setTransferred] = useState(0);
    const userId = firebase.auth().currentUser.uid;
    const navigation = useNavigation();
    const renderOption = (iconName, title) => {
        return (
            <TouchableOpacity onPress={()=>{
                if(title==="Edit Profile"){
                    navigation.navigate('EditProfile') 
                }else if(title==="My Friends"){
                    navigation.navigate("Friends")
                }else if(title==="Saved Messages"){
                    navigation.navigate("SavedMessages")
                }
            }} style={styles.option}>
                <View style={styles.optionLeft}>
                    <View style={styles.iconBackground}>
                        <Icon name={iconName} size={28} color="#FFF" />
                    </View>
                    <Text style={styles.optionText}>{title}</Text>
                </View>
                <Icon name="keyboard-arrow-right" size={24} color="#666" />
            </TouchableOpacity>
        );
    };
    useEffect(() => {
        const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}`);
        userRef.on('value', snapshot => {
            const userData = snapshot.val();
            setUser(userData);

            if (userData.friends) {
                setFriendsCount(Object.keys(userData.friends).length);
            }

            if (userData.conversations) {
                setConversationsCount(Object.keys(userData.conversations).length);
            }

            if (userData.groups) {
                setGroupsCount(Object.keys(userData.groups).length);
            }
        });

        // Cleanup on unmount
        return () => userRef.off();
    }, [userId]);

    if (!user) {
        return (
            <View style={styles.indicator}>
                <ActivityIndicator size="large" color="#FF8400" />
            </View>
        );
    }

    const handleImagePress = () => {
        setModalVisible(true);
    };

    const handleEditPress = () => {
        setEditModalVisible(true);
    };

    const selectImage = () => {
        ImageCropPicker.openPicker({
            width: 300,
            height: 300,
            cropping: true,
        }).then(image => {
            uploadImage(image.path);
            setEditModalVisible(false);
        }).catch(error => {
            console.log('ImagePicker Error: ', error);
            setEditModalVisible(false);
        });
    };
    
    const takePhoto = () => {
        ImageCropPicker.openCamera({
            width: 300,
            height: 300,
            cropping: true,
        }).then(image => {
            uploadImage(image.path);
            setEditModalVisible(false);
        }).catch(error => {
            console.log('ImagePicker Error: ', error);
            setEditModalVisible(false);
        });
    };

    const uploadImage = async (uri) => {
        if (!uri) {
            console.error('No URI provided for the image');
            setEditModalVisible(false);
            return;
        }
    
        const uploadUri = uri;
        const filename = `${userId}_pp.jpg`;  // Consistent naming convention using userId
        const folderPath = 'profile_pictures';
        const filePath = `${folderPath}/${filename}`;
        
        setEditModalVisible(false);
        setUploading(true);
        setTransferred(0);
    
        // Delete the old profile picture if it exists
        if (user && user.picture) {
            const oldPictureRef = storage().refFromURL(user.picture);
            try {
                await oldPictureRef.delete();
                console.log('Old profile picture deleted successfully');
            } catch (error) {
                console.error('Error deleting old profile picture:', error);
            }
        }
    
        const task = storage()
            .ref(filePath)
            .putFile(uploadUri);
    
        // Set transferred state
        task.on('state_changed', snapshot => {
            setTransferred(
                Math.round(snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
        });
    
        try {
            await task;
    
            const url = await storage().ref(filePath).getDownloadURL();
            setUser(prevState => ({ ...prevState, picture: url }));
            firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}`).update({
                picture: url,
            });
    
        } catch (e) {
            console.error(e);
        }
    
        setUploading(false);
        setEditModalVisible(false);
    };
    
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return format(date, 'dd MMMM yyyy');
    };
    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                <View style={styles.profileContainer}>
                    <TouchableOpacity onPress={handleImagePress}>
                        <Image source={{ uri: user.picture }} style={styles.profilePicture} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
                        <Icon name="edit" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.username}>{user.userName}</Text>
                <Text style={[styles.bio, {marginBottom: 5}]}>{user.bio}</Text>
                <Text style={[styles.bio, {marginBottom: 20, fontSize:11}]}>Join Date: {formatDate(user.createTime)}</Text>
                
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{friendsCount}</Text>
                        <Text style={styles.statLabel}>Friends</Text>
                    </View>
                    <View style={styles.divider}></View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{conversationsCount}</Text>
                        <Text style={styles.statLabel}>Conversations</Text>
                    </View>
                    <View style={styles.divider}></View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{groupsCount}</Text>
                        <Text style={styles.statLabel}>Groups</Text>
                    </View>
                </View>
            </View>
            <View style={styles.optionsContainer}>
                {renderOption('edit', 'Edit Profile')}
                {renderDivider()}
                {renderOption('people', 'My Friends')}
                {renderDivider()}
                {renderOption('bookmark', 'Saved Messages')}
                {renderDivider()}
                {renderOption('notifications', 'Notification Settings')}
                {renderDivider()}
                {renderOption('logout', 'Logout')}
            </View>
            
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalBackground}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContainer}>
                                <Image source={{ uri: user.picture }} style={styles.modalImage} />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <Modal
    visible={editModalVisible}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setEditModalVisible(false)}
>
    <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
                <View style={styles.editModalContainer}>
                    <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
                        <Text style={styles.modalOptionText}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalOption} onPress={selectImage}>
                        <Text style={styles.modalOptionText}>Choose from Library</Text>
                    </TouchableOpacity>
                </View>
            </TouchableWithoutFeedback>
        </View>
    </TouchableWithoutFeedback>
</Modal>

            {uploading && (
                <Modal transparent={true} animationType="none">
                    <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="large" color="#FF8400" />
                        <Text style={styles.uploadingText}>New Profile Photo Uploading</Text>
                    </View>
                </Modal>
            )}
        </ScrollView>
    );
};



const renderDivider = () => {
    return <View style={styles.optionDivider} />;
};

const { width, height } = Dimensions.get('window');
const modalSize = Math.min(width, height) * 0.8;

const styles = StyleSheet.create({
    indicator: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        borderTopRightRadius: 30,
        borderTopLeftRadius: 30,
        justifyContent: 'flex-start',
        alignItems: 'center',
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        backgroundColor: '#f5f5f5',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 5,
        elevation: 7,
        paddingVertical: 20,
    },
    profileContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    iconBackground: {
        width: 40,
        height: 40,
        borderRadius: 30,
        backgroundColor: '#FF8400',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    profilePicture: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginBottom: 10,
    },
    editButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: '#000',
        borderRadius: 20,
        padding: 5,
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    bio: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: Dimensions.get('window').width,
        marginTop: 20,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
    divider: {
        width: 1,
        height: '60%',
        backgroundColor: '#ccc',
    },
    optionsContainer: {
        width: Dimensions.get('window').width,
        paddingVertical: 10,
        flex: 1,
    },
    option: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginVertical: 5,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionText: {
        marginLeft: 15,
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
    },
    optionDivider: {
        height: 1,
        backgroundColor: '#ccc',
        marginHorizontal: 20,
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalContainer: {
        width: modalSize,
        height: modalSize,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: modalSize / 2,
        overflow: 'hidden',
    },
    modalImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: modalSize / 2,
    },
    editModalContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#f5f5f5',
        padding: 20,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 10,
    },
    modalOption: {
        paddingVertical: 15,
    },
    modalOptionText: {
        fontSize: 18,
        color: '#FF8400',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    uploadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    uploadingText: {
        marginTop: 10,
        fontSize: 18,
        color: '#FFF',
    },
});

export default Profile;
