import React from "react";
import { TouchableOpacity, Text, StyleSheet, Dimensions, View } from "react-native";
import Icon from 'react-native-vector-icons/FontAwesome5';

const RoomItem = ({ item, navigation }) => {

    
    return (
        <TouchableOpacity
            style={style.item}
            onPress={() => navigation.navigate('Chat', { roomId: item.id , name:item.name })}
        >
            <Icon name={'crow'} size={30} style={{ paddingRight: 15 }} />
            <View>
                <Text style={style.title}>{item.name}</Text>
                <Text style={style.name}>Room Owner: {item.userName}</Text>         
            </View>
        </TouchableOpacity>
    );
};

const style = StyleSheet.create({
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
        color: "black"
    },
    name: {
        fontSize: 12,
        color: "black"
    }
});

export default RoomItem;
