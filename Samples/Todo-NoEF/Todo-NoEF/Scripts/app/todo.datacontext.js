﻿/// <reference path="todo.model.js"/>
window.todoApp = window.ToDoApp || {};

window.todoApp.datacontext = (function (breeze) {

    var serviceName = "api/ToDo"; 
    var saveOptions = new breeze.SaveOptions({ allowConcurrentSaves: true });
    
    var dataService = new breeze.DataService({
        serviceName: serviceName,
        hasServerMetadata: false
    });

    var manager = new breeze.EntityManager({
            dataService: dataService,
            saveOptions: saveOptions
    });
    configureManagerToSaveOnModify();
    
    var metadataStore = manager.metadataStore;
    
    addClientMetadata(metadataStore);

    var saveIsPending = false;

    var datacontext = {
            name: "Breeze",
            metadataStore: metadataStore,
            getToDoLists: getToDoLists,
            createToDoList: createToDoList,
            createToDoItem: createToDoItem,
            saveNewToDoItem: saveNewToDoItem,
            saveNewToDoList: saveNewToDoList,
            deleteToDoItem: deleteToDoItem,
            deleteToDoList: deleteToDoList
        };

    return datacontext;
    
    function addClientMetadata(metadataStore) {
        var DataType = breeze.DataType;
        var et;
        
        et = new breeze.EntityType({
            shortName: "ToDoItem",
            namespace: "ToDoNoEF.Models",
            autoGeneratedKeyType: breeze.AutoGeneratedKeyType.Identity
        });
        et.addProperty( new breeze.DataProperty({
            name: "ToDoItemId",
            dataType: DataType.Int32,
            isNullable: false,
            isPartOfKey: true,
        }));
        et.addProperty(new breeze.DataProperty({
            name: "Title",
            dataType: DataType.String,
            isNullable: false,
        }));
        et.addProperty(new breeze.DataProperty({
            name: "IsDone",
            dataType: DataType.Boolean,
            isNullable: false,
        }));
        et.addProperty(new breeze.DataProperty({
            name: "ToDoListId",
            dataType: DataType.Int32,
            isNullable: false,
        }));
        et.addProperty(new breeze.NavigationProperty({
            name: "ToDoList",
            entityTypeName: "ToDoList",
            isScalar: true,
            associationName: "ToDoList_Items",
            foreignKeyNames: ["ToDoListId"]
        }));
        metadataStore.addEntityType(et);
        
        et = new breeze.EntityType({
            shortName: "ToDoList",
            namespace: "ToDoNoEF.Models",
            autoGeneratedKeyType: breeze.AutoGeneratedKeyType.Identity
        });
        et.addProperty(new breeze.DataProperty({
            name: "ToDoListId",
            dataType: DataType.Int32,
            isNullable: false,
            isPartOfKey: true,
        }));
        et.addProperty(new breeze.DataProperty({
            name: "Title",
            dataType: DataType.String,
            isNullable: false,
        }));
        et.addProperty(new breeze.DataProperty({
            name: "UserId",
            dataType: DataType.String,
            isNullable: false,
        }));

        et.addProperty(new breeze.NavigationProperty({
            name: "ToDos",
            entityTypeName: "ToDoItem",
            isScalar: false,
            associationName: "ToDoList_Items"
        }));
        metadataStore.addEntityType(et);
        


    }
 
    // Private Members
    function getToDoLists(toDoListsObservable, errorObservable) {
        return breeze.EntityQuery
            .from("ToDoLists")    // .expand("ToDos")
            .using(manager).execute()
            .then(getSucceeded)
            .fail(getFailed);

        function getSucceeded(data) {
            toDoListsObservable(data.results);
        }

        function getFailed(error) {
            errorObservable("Error retrieving toDo lists: " + error.message);
        }
    }
    
    function createToDoItem() {
        var item = metadataStore.getEntityType("ToDoItem").createEntity();
        manager.addEntity(item);
        return item;
    }
    
    function createToDoList() {
        var list = metadataStore.getEntityType("ToDoList").createEntity();
        manager.addEntity(list);
        return list;
    }
    
    function saveNewToDoItem(toDoItem) {
        return saveEntity(manager.addEntity(toDoItem));
    }
    
    function saveNewToDoList(toDoList) {
        return saveEntity(manager.addEntity(toDoList));
    }
    
    function deleteToDoItem(toDoItem) {
        toDoItem.entityAspect.setDeleted();
        return saveEntity(toDoItem);
    }
    
    function deleteToDoList(toDoList) {       
        // breeze doesn't cascade delete so we have to do it
        var toDoItems = toDoList.ToDos().slice(); // iterate over copy
        toDoItems.forEach(function(entity) { entity.entityAspect.setDeleted(); });
        toDoList.entityAspect.setDeleted();
        return saveEntity(toDoList);
    }
    
    function saveEntity(masterEntity) {
        if (saveIsPending) return null;
        masterEntity.ErrorMessage(null);
        saveIsPending = true;
        return manager.saveChanges().then(saveCompleted).fail(saveFailed);
        
        function saveCompleted() {
            saveIsPending = false;
        }

        function saveFailed(error) {
            setSaveErrorMessage();
            manager.rejectChanges();
            saveIsPending = false;
            throw error; // for benefit of caller
        }

        function setSaveErrorMessage() {
            var statename = masterEntity.entityAspect.entityState.name.toLowerCase();
            var typeName = masterEntity.entityType.shortName;
            var msg = "Error saving " + statename + " " + typeName;
            masterEntity.ErrorMessage(msg);
        }
    }
    
    function configureManagerToSaveOnModify() {
        manager.entityChanged.subscribe(function (args) {
            if (args.entityAction === breeze.EntityAction.EntityStateChange) {
                var entity = args.entity;
                if (entity.entityAspect.entityState.isModified()) {
                    saveEntity(entity);
                }
            }
        });
    }
    
})(breeze);