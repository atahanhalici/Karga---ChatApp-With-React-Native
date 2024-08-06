import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator, FlatList, Modal } from 'react-native';
import firebase from '@react-native-firebase/app';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import moment from 'moment';

const SavedMessages = () => {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savedMessages, setSavedMessages] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const handleImagePress = (image) => {
        setSelectedImage(image);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedImage(null);
    };

    useEffect(() => {
        const currentUser = firebase.auth().currentUser;
        const userRef = firebase
            .app()
            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`/users/${currentUser.uid}`);
    
        const fetchUserData = async () => {
            userRef.on('value', async (snapshot) => {
                const userData = snapshot.val();
                setUser(userData);
    
                const messages = await fetchSavedMessages(userData.savedMessages || {});
                setSavedMessages(messages);
                setLoading(false);
            });
        };
    
        const fetchSavedMessages = async (messages) => {
            const fetchedMessages = await Promise.all(
                Object.keys(messages).map(async (key) => {
                    const message = messages[key];
                    const senderSnapshot = await firebase
                        .app()
                        .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                        .ref(`/users/${message.senderId}`)
                        .once('value');
                    const senderData = senderSnapshot.val();
    
                    let chatData, messageData;
                    if (message.type === 'group') {
                        const groupSnapshot = await firebase
                            .app()
                            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                            .ref(`/groups/${message.id}`)
                            .once('value');
                        chatData = groupSnapshot.val();
    
                        // Fetch the specific message from the group's messages node
                        const groupMessageSnapshot = await firebase
                            .app()
                            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                            .ref(`/groups/${message.id}/messages/${message.messageId}`)
                            .once('value');
                        messageData = groupMessageSnapshot.val();
                    } else if (message.type === 'conversation') {
                        const conversationSnapshot = await firebase
                            .app()
                            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                            .ref(`/conversations/${message.id}`)
                            .once('value');
                        chatData = conversationSnapshot.val();
    
                        // Fetch the specific message from the conversation's messages node
                        const conversationMessageSnapshot = await firebase
                            .app()
                            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                            .ref(`/conversations/${message.id}/messages/${message.messageId}`)
                            .once('value');
                        messageData = conversationMessageSnapshot.val();
                    }
    
                    return {
                        ...message,
                        senderName: senderData.userName,
                        senderProfileImage: senderData.picture,
                        chatName: message.type === 'group' ? chatData.name : senderData.userName,
                        text: messageData.text,
                        type: messageData.messageType,
                        timestamp: messageData.timestamp,
                        messageType: message.type,
                        selectedUsers: messageData.selectedUsers
                    };
                })
            );
            return fetchedMessages;
        };
    
        fetchUserData();
    
        // Component unmount olduğunda dinleyiciyi kaldır
        return () => {
            userRef.off('value');
        };
    }, []);
    const renderMessageItem = ({ item }) => {
        // Mevcut kullanıcı id'si
        const currentUserId = firebase.auth().currentUser.uid;
    
        // Vibrasyon mesajı için gösterilecek metin
        let vibrationMessage = '';
    
        // Vibrasyon ve konuşma türü kontrolü
        if (item.type === 'vibration') {
            if (item.messageType === 'conversation') {
                if (item.senderId === currentUserId) {
                    vibrationMessage = `You vibrated ${item.chatName}`;
                } else {
                    vibrationMessage = `${item.senderName} vibrated you`;
                }
            } else if (item.messageType === 'group') {
                // Group türü için
                if (item.senderId === currentUserId) {
                    // Kullanıcı kendisi titrettiğinde
                    const selectedUserNames = item.selectedUsers
                        .map(user => user.userId === currentUserId ? 'you' : user.userName) // Kendi userId'sini kontrol et ve "you" yap
                        .join(', ');
                    vibrationMessage = `You vibrated ${selectedUserNames}`;
                } else {
                    // Başkası kullanıcıyı titrettiğinde
                    const selectedUserNames = item.selectedUsers
                        .map(user => user.userId === currentUserId ? 'you' : user.userName) // Kendi userId'sini kontrol et ve "you" yap
                        .join(', ');
                    vibrationMessage = `${item.senderName} vibrated ${selectedUserNames}`;
                }
            }
        }
    
        return (
            <TouchableOpacity  onPress={() => {
                if(item.messageType=="group"){
                    navigation.navigate('Chat', { groupId: item.id, name: item.chatName })
                }else if(item.messageType=="conversation"){
                    navigation.navigate('Chat', { conversationId:item.id, name: item.senderName });
                }
            }}>
                <View style={styles.item}>
                <Image style={styles.profileImage} source={{ uri: item.senderProfileImage }} />
                <View>
                    <Text style={styles.title}>{item.senderName === item.chatName ? item.senderName : `${item.senderName} · ${item.chatName}`}</Text>
                    {item.type === "image" ? (
                        <TouchableOpacity onPress={() => handleImagePress(item.text)}>
                            <Image style={{ width: 100, height: 100 }} source={{ uri: item.text }} />
                        </TouchableOpacity>
                    ) : item.type === 'vibration' ? (
                        <Text style={styles.bio}>{vibrationMessage}</Text>
                    ) : (
                        <Text style={styles.bio}>{item.text}</Text>
                    )}
                    <Text style={styles.bio}>
                        {moment(item.timestamp).format('DD MMMM YYYY · HH:mm')}
                    </Text>
                </View>
            </View>
            </TouchableOpacity>
            
        );
    };
    

    if (loading) {
        return (
            <LinearGradient
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.8, y: 0 }}
                colors={['#FF8400', '#FFA500']}
            >
                <View style={{ marginHorizontal: 15, marginVertical: 20 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Icon name="arrow-left" size={25} color="white" />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }} />
                        <Image style={{ width: 35, height: 35, marginRight: 10 }} source={require('../../../assets/images/logo_icon.png')} />
                        <Text style={{ fontSize: 27, fontWeight: '800', color: 'white' }}>Karga</Text>
                    </View>
                </View>
                <View style={styles.container}>
                    <View style={styles.indicator}>
                        <ActivityIndicator size="large" color="#FF8400" />
                    </View>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            style={styles.background}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 0 }}
            colors={['#FF8400', '#FFA500']}
        >
            <View style={{ marginHorizontal: 15, marginVertical: 20 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={25} color="white" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <Image style={{ width: 35, height: 35, marginRight: 10 }} source={require('../../../assets/images/logo_icon.png')} />
                    <Text style={{ fontSize: 27, fontWeight: '800', color: 'white' }}>Karga</Text>
                </View>
            </View>
            <View style={styles.container}>
                <Text style={{fontSize:25,fontWeight:'bold',color:'#4B4B4B',paddingBottom:20}}>Your Saved Messages</Text>
                <FlatList
                    data={savedMessages}
                    renderItem={renderMessageItem}
                    keyExtractor={(item, index) => index.toString()}
                />
                <Modal visible={modalVisible} transparent={true} onRequestClose={closeModal}>
                    <View style={styles.modalBackground}>
                        <TouchableOpacity style={styles.modalContainer} onPress={closeModal}>
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.fullscreenImage}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>
                </Modal>
            </View>
        </LinearGradient>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenImage: {
        width: '80%',
        height: 'auto',
        aspectRatio: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#FF8400',
        borderRadius: 20,
        paddingHorizontal: 10,
        backgroundColor: 'white',
        width: width - 20,
    },
    searchInput: {
        flex: 1,
        height: 40,
        color: '#FF8400',
    },
    searchLoading: {
        marginLeft: 10,
    },
    outlinedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderRadius: 20,
        marginHorizontal: 5,
    },
    buttonText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    buttonIcon: {
        marginRight: 10,
    },
    item: {
        backgroundColor: 'white',
        padding: 10,
        width: width - 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: 'black',
    },
    bio: {
        fontSize: 14,
        color: 'black',
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    background: {
        flex: 1,
    },
    indicator: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    container: {
        backgroundColor: 'white',
        flex: 1,
        borderTopRightRadius: 30,
        borderTopLeftRadius: 30,
        alignItems: 'center',
        paddingTop: 20,
    },
    placeholderText: {
        fontSize: 18,
        color: 'grey',
        textAlign: 'center',
        marginTop: 20,
    },
});

export default SavedMessages;
