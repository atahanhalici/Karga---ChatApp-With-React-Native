import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { FAB } from 'react-native-paper';
import Modal from 'react-native-modal';
import firebase from '@react-native-firebase/app';
import { FlatList } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';

const Messages = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [friends, setFriends] = useState([]);
    const [conversations, setConversations] = useState([]);
    const navigation = useNavigation();

    useEffect(() => {
        const userId = firebase.auth().currentUser.uid;
        const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}/conversations`);
        
        const onConversationsChange = userRef.on('value', snapshot => {
            const conversationsData = snapshot.val() || {};
            fetchConversations(conversationsData, userId);
        });

        return () => userRef.off('value', onConversationsChange);
    }, []);

    const fetchConversations = async (conversationsData, userId) => {
        try {
            const conversationList = await Promise.all(
                Object.keys(conversationsData).map(async (conversationId) => {
                    const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}`);
                    
                    const onMessagesChange = conversationRef.on('value', async snapshot => {
                        const conversation = snapshot.val();
                        if (conversation && conversation.members) {
                            const friendId = conversation.members.find(id => id !== userId);
                            const friendRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${friendId}`);
                            const friendSnapshot = await friendRef.once('value');
                            const friend = friendSnapshot.val();

                            const messages = conversation.messages ? Object.entries(conversation.messages) : [];
                            const sortedMessages = messages.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
                            const lastMessage = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1][1].text : '';

                            setConversations(prevConversations => {
                                const updatedConversations = prevConversations.filter(conv => conv.conversationId !== conversationId);
                                return [...updatedConversations, {
                                    conversationId,
                                    friend,
                                    lastMessage,
                                }];
                            });
                        }
                    });

                    return () => conversationRef.off('value', onMessagesChange);
                })
            );
        } catch (error) {
            console.error("Error fetching conversations:", error);
        }
    };

    const toggleModal = () => {
        setIsModalVisible(!isModalVisible);
        if (!isModalVisible) {
            fetchFriends();
        }
    };

    const fetchFriends = () => {
        try {
            const userId = firebase.auth().currentUser.uid;
            const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}`);
            
            const onValueChange = userRef.on('value', snapshot => {
                const userData = snapshot.val();
                if (userData && userData.friends) {
                    const friendIds = userData.friends;
                    const friendsRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref('/users');
                    
                    friendsRef.on('value', snapshot => {
                        const allUsers = snapshot.val();
                        const friendsList = friendIds.map(id => allUsers[id]);
                        setFriends(friendsList);
                    }, error => {
                        console.error("Error fetching friends list:", error);
                    });
                }
            });
    
            return () => {
                userRef.off('value', onValueChange);
                friendsRef.off('value'); // Remember to turn off listener when the component unmounts
            };
        } catch (error) {
            console.error("Unexpected error:", error);
        }
    };
    

    const handleFriendPress = async (friend) => {
        const userId = firebase.auth().currentUser.uid;
        const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref('/conversations');
        const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}/conversations`);
        
        let conversationId;
    
        // Get user's conversations
        const userConversationsSnapshot = await userRef.once('value');
        const userConversations = userConversationsSnapshot.val() || {};
    
        // Check if a conversation with this friend already exists
        for (const [key, value] of Object.entries(userConversations)) {
            const conversationSnapshot = await conversationRef.child(key).once('value');
            const conversation = conversationSnapshot.val();
            if (conversation && conversation.members.includes(friend.userId)) {
                conversationId = key;
                break;
            }
        }
    
        // If conversation doesn't exist, create a new one
        if (!conversationId) {
            const newConversationRef = conversationRef.push();
            conversationId = newConversationRef.key;
            await newConversationRef.set({
                members: [userId, friend.userId].sort(),
                messages: {}
            });
    
            // Add conversation to users' list
            const friendRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${friend.userId}/conversations/${conversationId}`);
            await userRef.child(conversationId).set(true);
            await friendRef.set(true);
        }
    
        // Navigate to chat page
        navigation.navigate('Chat', { conversationId, name: friend.userName });
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={conversations}
                keyExtractor={(item) => item.conversationId}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => navigation.navigate('Chat', { conversationId: item.conversationId, name: item.friend.userName })}
                    >
                        <Icon name={'crow'} size={30} style={{ paddingRight: 15 }} />
                        <View>
                            <Text style={styles.title}>{item.friend.userName}</Text>
                            <Text style={styles.name}>{item.lastMessage}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
            <FAB
                style={styles.fab}
                icon="message-text"
                color="white"
                onPress={toggleModal}
            />
            <Modal
                isVisible={isModalVisible}
                animationIn="slideInUp"
                animationOut="slideOutDown"
                onBackdropPress={toggleModal}
                backdropOpacity={0.5}
                style={styles.modal}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Friends</Text>
                    <FlatList
                        data={friends}
                        keyExtractor={(item) => item.userId}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => handleFriendPress(item)}
                            >
                                <Icon name={'crow'} size={30} style={{ paddingRight: 15 }} />
                                <View>
                                    <Text style={styles.title}>{item.userName}</Text>
                                    <Text style={styles.name}>{item.bio}</Text>
                                </View>
                                <View style={{flex:1}} />
                                <View style={[styles.dot,{backgroundColor:(item.online)?'green':'red'}]} />
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        width: "100%",
    },
    text: {
        fontSize: 18,
        color: '#333',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: '#FF8400',
    },
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '70%',
    },
    modalTitle: {
        fontSize: 20,
        marginBottom: 10,
    },
    friendItem: {
        fontSize: 18,
        color:'black',
        
    },
    item: {
        backgroundColor: 'white',
        padding: 10,
        width: Dimensions.get('window').width - 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: 'black'
    },
    name: {
        fontSize: 14,
        color: 'black'
    },
    dot: {
        width: 13,
        height: 13,
        borderRadius: 7.5, // Yarıçap, genişlik ve yüksekliğin yarısı olmalıdır
        marginRight: 20, // İkona padding-right vermek yerine margin-right kullanıyoruz
    }
});

export default Messages;
