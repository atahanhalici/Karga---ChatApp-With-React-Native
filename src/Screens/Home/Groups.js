import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, Alert, Animated } from 'react-native';
import { FAB } from 'react-native-paper';
import Modal from 'react-native-modal';
import firebase from '@react-native-firebase/app';
import { FlatList } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';

const Groups = () => {
    const [groups, setGroups] = useState([]);
    const [friends, setFriends] = useState([]);
    const [filteredFriends, setFilteredFriends] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const userId = firebase.auth().currentUser.uid;
    const [groupName, setGroupName] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [filterInputVisible, setFilterInputVisible] = useState(false);
    const [filterInputHeight] = useState(new Animated.Value(0));
    const navigation = useNavigation();

    useEffect(() => {
        // İnternetten verileri çekme işlemini burada yapabilirsiniz
        // Örneğin: firebase.firestore().collection('groups').get().then(snapshot => setGroups(snapshot.docs.map(doc => doc.data())));
    }, []);

    useEffect(() => {
        setFilteredFriends(
            friends.filter(friend => 
                friend.userName.toLowerCase().includes(searchText.toLowerCase())
            )
        );
    }, [searchText, friends]);

    const toggleModal = () => {
        if (isModalVisible) {
            // Reset states when closing the modal
            setGroupName('');
            setSelectedFriends([]);
            setSearchText('');
            setFilterInputVisible(false);
            Animated.timing(filterInputHeight, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            }).start();
        } else {
            fetchFriends();
        }
        setIsModalVisible(!isModalVisible);
    };

    const handleFriendPress = (friend) => {
        setSelectedFriends(prevSelectedFriends => {
            if (prevSelectedFriends.includes(friend.userId)) {
                return prevSelectedFriends.filter(id => id !== friend.userId);
            } else {
                return [...prevSelectedFriends, friend.userId];
            }
        });
    };

    const fetchFriends = () => {
        try {
            const userId = firebase.auth().currentUser.uid;
            const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}`);
            var friendsRef;
            const onValueChange = userRef.on('value', snapshot => {
                const userData = snapshot.val();
                if (userData && userData.friends) {
                    const friendIds = userData.friends;
                    friendsRef  = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref('/users');
                    
                    friendsRef.on('value', snapshot => {
                        const allUsers = snapshot.val();
                        const friendsList = friendIds.map(id => allUsers[id]);
                        setFriends(friendsList);
                        setFilteredFriends(friendsList);
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

    const createGroup = async() => {
        if (!groupName.trim()) {
            Alert.alert('Hata', 'Lütfen bir grup adı girin.');
            return;
        }

        if (selectedFriends.length === 0) {
            Alert.alert('Hata', 'Lütfen en az bir arkadaş seçin.');
            return;
        }

       const groupRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref('/groups');
        const newGroupRef = groupRef.push();
        groupId = newGroupRef.key;
        await newGroupRef.set({
            members: [userId].sort(),
            messages: {},
            name:groupName.trim(),
            userStatus: {
                [userId]: {
                    inChat: true,
                    lastLeft: null,
                    write:false
                },
            }
        });
      const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}/groups`);

        // groups kısmına veri ekleme
        await userRef.child(groupId).set(true);

        const otherUserIds = selectedFriends.filter(friendId => friendId !== userId);
        console.log('Diğer kullanıcıların ID\'leri:', otherUserIds);
        // Grubu oluşturma işlemini burada yapabilirsiniz
        // Örneğin: firebase.firestore().collection('groups').add({ groupName, members: selectedFriends });
        otherUserIds.forEach(async (otherUser) => {
            const otherUserRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${otherUser}/notifications`);
            await otherUserRef.push().set({
                notificationType: "group",
                id: groupId,
                senderName: firebase.auth().currentUser.displayName,
                name: groupName.trim(),
                senderId:userId
            });

            const otherUserSnapshot = await firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`users/${otherUser}`).once('value');
            const otherUserData = otherUserSnapshot.val();
           const token = otherUserData.fcmToken;
            fetch('http://192.168.0.23:3000/send-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: token,
                    title: `Grup Daveti`,
                    body: `${firebase.auth().currentUser.displayName} sizi ${groupName.trim()} adlı gruba davet etti`
                })
            }).then(response => response.json())
                .then(data => {
                    console.log('Notification sent:', data);
                }).catch(error => {
                    console.error('Error sending notification:', error);
                });
        });

        toggleModal();
    };

    const toggleFilterInput = () => {
        setFilterInputVisible(!filterInputVisible);
        Animated.timing(filterInputHeight, {
            toValue: filterInputVisible ? 0 : 70, // Animasyonun hedef değeri
            duration: 300, // Animasyon süresi
            useNativeDriver: false, // Native Driver kullanılmaz
        }).start();
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={groups}
                keyExtractor={(item) => item.groupId}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.item}
                        // onPress={() => navigation.navigate('Chat', { conversationId: item.conversationId, name: item.friend.userName })}
                    >
                        <Icon name={'crow'} size={30} style={{ paddingRight: 15 }} />
                        <View>
                            <Text style={styles.title}>{item.friend.userName}</Text>
                            <Text style={styles.name}>
                                {item.lastMessage.messageType == "vibration" 
                                    ? (item.lastMessage.userId == userId 
                                        ? `${item.friend.userName} kullanıcısını titrettiniz` 
                                        : `${item.friend.userName} sizi titretti`) 
                                    : item.lastMessage.text}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <View style={{ marginRight: 15 }}>
                            {item.unreadMessagesCount > 0 && (
                                <View style={{ backgroundColor: '#FF8400', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 6 }}>
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>{item.unreadMessagesCount}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
            />
            <FAB
                style={styles.fab}
                icon="plus"
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
                    <Text style={styles.modalTitle}>Grup Oluştur</Text>
                    <View style={{ flexDirection: 'row', paddingLeft: 20, paddingRight: 20, alignItems: 'center' }}>
                        <TextInput
                            style={styles.input}
                            placeholder="Grup adı"
                            value={groupName}
                            onChangeText={setGroupName}
                        />
                        <TouchableOpacity onPress={toggleFilterInput} style={{ marginRight: 20 }}>
                            <Icon name={'filter'} size={30} style={{ marginLeft: 15 }} />
                        </TouchableOpacity>
                    </View>
                    <Animated.View style={{ height: filterInputHeight, overflow: 'hidden', marginBottom: 10 }}>
                        {filterInputVisible && (
                            <TextInput
                                style={[styles.input, { marginTop: 0, width: Dimensions.get('window').width-40 , marginRight:20 }]}
                                placeholder="Arkadaş ara"
                                value={searchText}
                                onChangeText={setSearchText}
                            />
                        )}
                    </Animated.View>
                    <FlatList
                        data={filteredFriends}
                        keyExtractor={(item) => item.userId}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.item, selectedFriends.includes(item.userId) && styles.selectedItem]}
                                onPress={() => handleFriendPress(item)}
                            >
                                <Icon name={'crow'} size={30} style={{ paddingRight: 15 }} />
                                <View>
                                    <Text style={styles.title}>{item.userName}</Text>
                                    <Text style={styles.name}>{item.bio}</Text>
                                </View>
                                <View style={{ flex: 1 }} />
                                <View style={[styles.dot, { backgroundColor: (item.online) ? 'green' : 'red' }]} />
                            </TouchableOpacity>
                        )}
                    />
                    <TouchableOpacity style={styles.createButton} onPress={createGroup}>
                        <Text style={styles.createButtonText}>Grubu Oluştur</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
};

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
    input: {
        backgroundColor: 'white',
        marginVertical: 10,
        borderColor: '#FF8400',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 10,
        width: Dimensions.get('window').width - 70,
        justifyContent: 'center',
        marginLeft: 20
    },
    friendItem: {
        fontSize: 18,
        color: 'black',
    },
    item: {
        backgroundColor: 'white',
        padding: 10,
        width: Dimensions.get('window').width - 45,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5,
    },
    selectedItem: {
        backgroundColor: 'rgba(255, 132, 0, 0.2)',
        borderRadius: 10
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: 'black',
    },
    name: {
        fontSize: 14,
        color: 'black',
    },
    dot: {
        width: 13,
        height: 13,
        borderRadius: 7.5,
        marginRight: 20,
    },
    createButton: {
        marginTop: 20,
        width: Dimensions.get('window').width - 30,
        backgroundColor: '#FF8400',
        padding: 10,
        borderRadius: 15,
        flexDirection: 'column',
        alignItems: 'center'
    },
    createButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default Groups;