import {Body, Controller, Get, Path, Post, Route, SuccessResponse, Tags} from "tsoa";
import type {
    AddCreatorsRequest,
    AddCreatorsResponse,
    CountResponse,
    CreateWaitingListRequest,
    RemoveCreatorRequest,
    RemoveCreatorResponse,
    TakeCreatorsRequest,
    TakeCreatorsResponse,
    WaitingListResponse
} from "../models/api";
import {waitingListService} from "../services/WaitingListService";

@Route("waiting-list")
@Tags("Waiting List")
export class WaitingListController extends Controller {
    @Get()
    public getWaitingList(): WaitingListResponse {
        return waitingListService.getWaitingList();
    }

    @Get("count")
    public getCount(): CountResponse {
        return waitingListService.getCount();
    }

    @SuccessResponse("201", "Created")
    @Post()
    public createWaitingList(@Body() request: CreateWaitingListRequest): WaitingListResponse {
        this.setStatus(201);
        return waitingListService.createWaitingList(request.capacity ?? 10);
    }

    @Post("creators")
    public addCreators(@Body() request: AddCreatorsRequest): AddCreatorsResponse {
        return waitingListService.addCreators(request.creators);
    }

    @Post("take")
    public takeCreators(@Body() request: TakeCreatorsRequest): TakeCreatorsResponse {
        return waitingListService.takeCreators(request.count, request.removal_reason);
    }

    @Post("creators/{creatorId}/remove")
    public removeCreator(
        @Path() creatorId: string,
        @Body() request: RemoveCreatorRequest
    ): RemoveCreatorResponse {
        return waitingListService.removeCreator(creatorId, request.removal_reason);
    }
}
